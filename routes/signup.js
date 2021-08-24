const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const {v4: uuidv4} = require('uuid');
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
  const usernameExists = await usernameAlreadyExists(req.body.username);

  if (usernameExists === 'ERROR-OCCURRED') {
    res.status(500).send('ERROR-OCCURRED');
    return;
  }

  if (usernameExists) {
    res.status(500).send('Username taken');
    return;
  }

  const emailExists = await emailAlreadyExists(req.body.email);

  if (emailExists === 'ERROR-OCCURRED') {
    res.status(500).send('ERROR-OCCURRED');
    return;
  }

  if (emailExists) {
    res.status(500).send('Email taken');
    return;
  }

  /*
   * If someone previously tried to create an account with this email but didn't
   * complete the registration process, the data relating to this gets deleted.
   */
  const rowIsInTable = await rowInTable(req.body.email);

  if (rowIsInTable === 'ERROR-OCCURRED') {
    res.status(500).send('ERROR-OCCURRED');
    return;
  }

  if (rowIsInTable) {
    const status = await deleteRowFromTable('UnactivatedAccounts', req.body.email);

    if (status === 'ERROR-OCCURRED') {
      res.status(500).send('ERROR-OCCURRED');
      return;
    }
  }

  const activationCode = randomstring.generate({length: 6, charset: 'numeric'});
  await sendEmailActivationCode(req.body.email, activationCode);

  const status = await saveUserInfo(activationCode, req.body.name, req.body.username, req.body.email, req.body.password);

  if (status === 'ERROR-OCCURRED') {
    res.status(500).send('ERROR-OCCURRED');
    return;
  }

  res.status(200).send('Success');
});


/*
 * Checks whether the username provided already exists.
 */
async function usernameAlreadyExists(username) {
  const params = {
    TableName: 'Users',
    IndexName: 'username-index',
    KeyConditionExpression: 'username = :username',
    ExpressionAttributeValues: {
      ':username': username,
    },
  };

  try {
    const user = await dynamoDbClient.query(params).promise();

    if (user.Count === 0) {
      return false;
    }
    return true;
  } catch (err) {
    console.log('An error occurred - signup.js - usernameAlreadyExists()\n');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


/*
 * Checks whether the email provided already exists.
 */
async function emailAlreadyExists(email) {
  const params = {
    TableName: 'Users',
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
  };

  try {
    const user = await dynamoDbClient.query(params).promise();

    if (user.Count === 0) {
      return false;
    }
    return true;
  } catch (err) {
    console.log('An error occurred - signup.js - emailAlreadyExists()\n');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


/*
 * Checks whether the email provided already exists in the UnactivatedAccounts
 * table.
 */
async function rowInTable(email) {
  const params = {
    TableName: 'UnactivatedAccounts',
    Key: {
      'email': email,
    },
  };

  try {
    const response = await dynamoDbClient.get(params).promise();

    if (isEmpty(response)) {
      return false;
    }
    return true;
  } catch (err) {
    console.log('An error occurred - signup.js - rowInTable()\n');
    console.log(err);
    return 'ERROR-OCCURRED';
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
 * Deletes the specified row from the specified table.
 */
async function deleteRowFromTable(table, email) {
  const params = {
    TableName: table,
    Key: {
      email: email,
    },
  };

  try {
    await dynamoDbClient.delete(params).promise();
    return 'Success';
  } catch (err) {
    console.log('An error occurred - signup.js - deleteRowFromTable()\n');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


/*
 * Sends the user an email with an activation code.
 */
async function sendEmailActivationCode(email, activationCode) {
  const api = new SibApiV3Sdk.TransactionalEmailsApi();
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail = {
    to: [{
      email: email,
    }],
    templateId: 1,
    params: {
      activationCode: activationCode,
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  await api.sendTransacEmail(sendSmtpEmail).then(function(data) {
    console.log('API called successfully. Returned data: ' + data);
  }, function(error) {
    console.error(error.message);
  });
}


/*
 * Saves the user's info.
 */
async function saveUserInfo(activationCode, name, username, email, password) {
  const params = {
    TableName: 'UnactivatedAccounts',
    Item: {
      email: email,
      name: name,
      username: username,

      // bcrypt automatically saves the salt inside the password
      password: await bcrypt.hash(password, 10),

      activationCode: activationCode,
      timeToLive: Math.ceil(Date.now() / 1000) + 60 * 15, // 15 mins
      avatarString: uuidv4(),
      creationDate: getDate(),
      currentRoomOpen: null,
    },
  };

  try {
    await dynamoDbClient.put(params).promise();
    return 'Success';
  } catch (err) {
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Retrieves the current date.
function getDate() {
  const dateObj = new Date();

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
}


module.exports = router;
