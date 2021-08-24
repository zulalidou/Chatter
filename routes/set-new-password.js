const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-west-2',
  endpoint: 'https://dynamodb.us-west-2.amazonaws.com',
});

// a simplified client for interacting with DynamoDB
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

// ------------------------------------
// For accessing the SendInBlue API
const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;

// Configure API key authorization: api-key
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.Sib_API_Key;


router.post('/', async function(req, res) {
  const userInfo = await getUserInfo(req.body.email);

  if (userInfo === 'ERROR-OCCURRED') {
    res.status(500).send('Couldn\'t set new password');
    return;
  }

  // bcrypt automatically saves the salt inside the password
  userInfo.password = await bcrypt.hash(req.body.password, 10);

  const dataUpdated = await updateUserInfo(userInfo);

  if (dataUpdated === 'ERROR-OCCURRED') {
    res.status(500).send('Couldn\'t update user info');
    return;
  }


  sendEmailNotification(userInfo.email, userInfo.name.split(' ')[0]);

  res.status(200).send('Success');
});


/*
 * Retrieves the specified user's info.
 */
async function getUserInfo(email) {
  const params = {
    TableName: 'Users',
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :e',
    ExpressionAttributeValues: {
      ':e': email,
    },
  };

  try {
    const response = await dynamoDbClient.query(params).promise();
    return response.Items[0];
  } catch (err) {
    console.log('An error occurred - set-user-info.js - getUserInfo()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


/*
 * Updates the specified user's info.
 */
async function updateUserInfo(userInfo) {
  const params = {
    TableName: 'Users',
    Item: userInfo,
  };

  try {
    await dynamoDbClient.put(params).promise();
    return true;
  } catch (err) {
    console.log('An error occurred - set-user-info.js - saveUserInfo()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


/*
 * Sends the user a notification through their email address.
 */
function sendEmailNotification(email, firstName) {
  const api = new SibApiV3Sdk.TransactionalEmailsApi();
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail = {
    to: [{
      email: email,
    }],
    templateId: 5,
    params: {
      firstName: firstName,
      attribute: 'password',
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  api.sendTransacEmail(sendSmtpEmail).then(
      function(data) {}
      , function(error) {
        console.log('\n\nAn error has occurred - set-user-info.js - sendEmailNotification()');
        console.error(error.message);
      });
}


module.exports = router;
