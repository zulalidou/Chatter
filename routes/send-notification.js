const express = require('express');
const router = express.Router();
const {v4: uuidv4} = require('uuid');
const jwt = require('jsonwebtoken');

const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-west-2',
  endpoint: 'https://dynamodb.us-west-2.amazonaws.com',
});

// a simplified client for interacting with DynamoDB
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

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
    console.log('An error occurred - send-notification.js - authenticate()\n');
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

    if (isEmpty(jwt)) {
      return false;
    }
    return true;
  } catch (err) {
    return 'ERROR-OCCURRED';
  }
}


router.post('/', authenticate, async function(req, res) {
  const status = await saveNotification(req.body);

  if (status === 'ERROR-OCCURRED') {
    res.status(500).send('Operation failed');
    return;
  }

  res.status(200).end('Success');
});


/*
 * Saves the notification.
 */
async function saveNotification(notification) {
  const params = {
    TransactItems: [
      {
        Put: {
          TableName: 'Notifications',
          Item: notification,
        },
      },
      {
        Put: {
          TableName: 'Users_Notifications',
          Item: {
            id: uuidv4(),
            userID: notification.recipient,
            notificationID: notification.id,
            timeToLive: notification.timeToLive,
          },
        },
      },
    ],
  };

  try {
    await dynamoDbClient.transactWrite(params).promise();
    return 'SUCCESS';
  } catch (err) {
    console.log('\nAn error occurred - send-notification.js - saveNotification()');
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


module.exports = router;
