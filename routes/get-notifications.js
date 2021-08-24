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
    console.log('An error occurred - get-notifications.js - authenticate()\n');
    res.status(200).send([]);
    return;
  }

  next();
}


// Checks to see whether the token passed has been blacklisted.
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


router.get('/', authenticate, async function(req, res) {
  const notifications = await getNotifications(req.query.userID);

  if (notifications === 'ERROR-OCCURRED') {
    res.status(404).send('Couldn\'t retrieve data');
    return;
  }


  const userNotifications = [];

  for (let i = 0; i < notifications.length; i++) {
    const notification = await getNotification(notifications[i].notificationID);

    if (notification === 'ERROR-OCCURRED') {
      res.status(404).send('Couldn\'t retrieve data');
      return;
    }

    userNotifications.push(notification);
  }

  res.status(200).send(userNotifications);
});


// Retrieves the user's notifications.
async function getNotifications(userID) {
  const params = {
    TableName: 'Users_Notifications',
    IndexName: 'userID-index',
    KeyConditionExpression: 'userID = :uid',
    ExpressionAttributeValues: {
      ':uid': userID,
    },
  };

  try {
    const groups = await dynamoDbClient.query(params).promise();
    return groups.Items;
  } catch (err) {
    console.log('\nAn error occurred - get-qualifications.js - getNotifications()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Retrieves the specified notification.
async function getNotification(id) {
  const params = {
    TableName: 'Notifications',
    Key: {
      id: id,
    },
  };

  try {
    const user = await dynamoDbClient.get(params).promise();
    return user.Item;
  } catch (err) {
    console.log('\nAn error occurred - get-qualifications.js - getNotification()');
    console.log(err);
    return 'ERROR-COMPONENT';
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
