const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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


/*
 * This function determines whether or not the incoming request should be
 * executed. If it decides it shouldn't be executed, it returns a 401 status
 * code, otherwise, it continues with the request.
 */
async function authenticate(req, res, next) {
  try {
    jwt.verify(req.cookies.jwtHP + '.' + req.cookies.jwtS, process.env.jwtSignKey);


    /*
     * Checks to see if the jwt token is stored in the BlacklistedJWTs table
     * - If it is, then it denies the request. Otherwise, the request is allowed
     */
    const tokenIsBlacklisted = await tokenBlacklisted(req.cookies.jwtHP + '.' + req.cookies.jwtS);

    if (tokenIsBlacklisted === 'ERROR-OCCURRED') {
      res.status(401).send('An error occurred');
      return;
    }

    if (tokenIsBlacklisted) {
      res.status(401).send('The token was blacklisted');
      return;
    }
  } catch (err) {
    console.log('An error occurred - set-user-info.js - authenticate()\n');
    res.status(401).send(err.message);
    return;
  }

  next();
}


/*
 * Checks to see whether the token passed has been blacklisted.
 */
async function tokenBlacklisted(jwt) {
  const params = {
    TableName: 'BlacklistedJWTs',
    Key: {
      jwt: jwt,
    },
  };

  try {
    const response = await dynamoDbClient.get(params).promise();
    const jwt = response.Item;

    if (jwt === undefined) {
      return false;
    }

    if (isEmpty(jwt)) {
      return false;
    }

    return true;
  } catch (err) {
    return 'ERROR-OCCURRED';
  }
}


router.post('/', authenticate, async function(req, res) {
  const userInfo = await getUserInfo(req.body.userID);

  if (userInfo === 'ERROR-OCCURRED') {
    res.status(404).send('The requested resource was not found.');
    return;
  }


  if (req.body.attribute === 'password') {
    userInfo[req.body.attribute] = await bcrypt.hash(req.body.value, 10);
  } else {
    userInfo[req.body.attribute] = req.body.value;
  }

  const dataUpdated = await updateUserInfo(userInfo);

  if (dataUpdated === 'ERROR-OCCURRED') {
    res.status(500).send('Couldn\'t update user info');
    return;
  }

  if (req.body.attribute === 'name' || req.body.attribute === 'password') {
    sendEmailNotification(userInfo.email, userInfo.name.split(' ')[0], req.body.attribute);
  }

  res.status(200).send('Success');
});


/*
 * Retrieves the specified user's info.
 */
async function getUserInfo(id) {
  const params = {
    TableName: 'Users',
    Key: {
      id: id,
    },
  };

  try {
    const response = await dynamoDbClient.get(params).promise();
    return response.Item;
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
function sendEmailNotification(email, firstName, attribute) {
  const api = new SibApiV3Sdk.TransactionalEmailsApi();
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail = {
    to: [{
      email: email,
    }],
    templateId: 5,
    params: {
      firstName: firstName,
      attribute: attribute,
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


function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}


module.exports = router;
