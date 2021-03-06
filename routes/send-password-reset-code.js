const express = require('express');
const router = express.Router();
const randomstring = require('randomstring');

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
  res.status(200).send('Success');

  /*
   * The reason this call is ended immediately is so that if the user happens to
   * be testing the app to see which email addresses are registered with this
   * app and which aren't, they wouldn't be able to do that. Every single time
   * they provide an email address, they'll just get a message telling them that
   * a reset code has been sent to email address they provided. If that email
   * address truly is registered with the app, then an email with a password
   * reset code really will be sent to it. If that email address ISN'T
   * registered with the app, then no email gets sent.
   *
   * The instructions below still get executed.
   */

  const userInfo = await getUserInfo(req.body.email);

  if (!isEmpty(userInfo)) {
    const resetCode = randomstring.generate({length: 6, charset: 'numeric'});
    const data = {
      email: req.body.email,
      resetCode: resetCode,
      timeToLive: Math.ceil(Date.now() / 1000) + (60 * 15), // 15 mins
    };

    storePasswordResetCode(data);
    sendPasswordResetCode(userInfo.email, userInfo.name.split(' ')[0], resetCode);
  }
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
    const users = await dynamoDbClient.query(params).promise();
    return users.Items[0];
  } catch (err) {
    console.log('An error occurred (send-password-reset-code.js userExists())');
    console.log(err);
    return null;
  }
}


/*
 * Checks if the object passed into the function is empty. If yes it returns
 * true, otherwise it returns false.
 */
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}


/*
 * Stores the password reset code.
 */
function storePasswordResetCode(data) {
  const params = {
    TableName: 'PasswordChangeRequests',
    Item: data,
  };

  try {
    dynamoDbClient.put(params).promise();
  } catch (err) {
    console.log('An error occurred - send-password-reset-code.js - storePasswordResetCode()');
    console.log(err);
    return null;
  }
}


/*
 * Sends a password reset code.
 */
function sendPasswordResetCode(email, firstName, resetCode) {
  const api = new SibApiV3Sdk.TransactionalEmailsApi();
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail = {
    to: [{
      email: email,
    }],
    templateId: 4,
    params: {
      firstName: firstName,
      resetCode: resetCode,
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  api.sendTransacEmail(sendSmtpEmail).then(function(data) {
    console.log('API called successfully. Returned data: ' + data);
  }, function(error) {
    console.error(error.message);
  });
}


module.exports = router;
