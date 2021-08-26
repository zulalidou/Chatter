const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-west-2',
  endpoint: 'https://dynamodb.us-west-2.amazonaws.com',
});

// a simplified client for interacting with DynamoDB
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();


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
    console.log('An error occurred - notification-check.js - authenticate()\n');
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


router.get('/', authenticate, async function(req, res) {
  const notificationsList = await getUserNotifications(req.query.userID);

  if (notificationsList === 'ERROR-OCCURRED') {
    res.status(404).send('Couldn\'t retrieve data.');
    return;
  }

  for (let i = 0; i < notificationsList.length; i++) {
    const notification = await getNotification(notificationsList[i].notificationID);

    if (notification === 'ERROR-OCCURRED') {
      res.status(404).send('Couldn\'t retrieve data.');
      return;
    }

    if (notification.type === req.query.type && notification[req.query.attribute] === req.query.value) {
      res.status(200).send('USER-RECEIVED-NOTIFICATION');
      return;
    }
  }

  res.status(200).send('USER-DID-NOT-RECEIVE-NOTIFICATION');
});


// Retrieves the specified user's notifications.
async function getUserNotifications(userID) {
  const params = {
    TableName: 'Users_Notifications',
    IndexName: 'userID-index',
    KeyConditionExpression: 'userID = :uid',
    ExpressionAttributeValues: {
      ':uid': userID,
    },
  };

  try {
    const users = await dynamoDbClient.query(params).promise();
    return users.Items;
  } catch (err) {
    console.log('An error occurred - notification-check.js - getUserNotifications()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Retrieves the notification.
async function getNotification(id) {
  const params = {
    TableName: 'Notifications',
    Key: {
      id: id,
    },
  };

  try {
    const users = await dynamoDbClient.get(params).promise();
    return users.Item;
  } catch (err) {
    console.log('An error occurred - notification-check.js - getNotification()');
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
