const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-west-2',
  endpoint: 'https://dynamodb.us-west-2.amazonaws.com'
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
    console.log('An error occurred - delete-notification.js - authenticate()\n');
    console.log(err.message);
    res.status(401).send(err.message);
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
  // 1. Remove notification from user's info
  // 2. Remove notification from Notifications table in DB

  const notificationID = await getNotificationID(req.query.userID, req.query.groupID);

  if (notificationID === 'ERROR-OCCURRED') {
    res.status(404).send('The requested resource was not found.');
    return;
  }


  const notificationMembershipID = await getNotificationMembershipID(notificationID);

  if (notificationMembershipID === 'ERROR-OCCURRED') {
    res.status(404).send('The requested resource was not found.');
    return;
  }


  const status = await deleteNotifications(notificationID, notificationMembershipID);

  if (status === 'ERROR-OCCURRED') {
    res.status(404).send('The requested resource was not found.');
    return;
  }


  res.status(200).send();
});


async function getNotificationID(userID, groupID) {
  const params = {
    TableName: 'Notifications',
    IndexName: 'recipient-index',
    KeyConditionExpression: 'recipient = :r',
    ExpressionAttributeValues: {
      ':r': userID,
    },
  };

  try {
    const response = await dynamoDbClient.query(params).promise();

    let notificationID = null;

    for (let i = 0; i < response.Items.length; i++) {
      if (response.Items[i].type === 'group-invitation' && response.Items[i].groupID === groupID) {
        notificationID = response.Items[i].id;
      }
    }

    return notificationID;
  } catch (err) {
    console.log('An error occurred - delete-notification.js - getNotificationID()\n');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


/*
 * Retrives the membership id (in the Users_Notifications table) of the
 * specified notification.
 */
async function getNotificationMembershipID(notificationID) {
  const params = {
    TableName: 'Users_Notifications',
    IndexName: 'notificationID-index',
    KeyConditionExpression: 'notificationID = :nid',
    ExpressionAttributeValues: {
      ':nid': notificationID,
    },
  };

  try {
    const response = await dynamoDbClient.query(params).promise();
    const notificationID = null;
    return response.Items[0].id;
  } catch (err) {
    console.log('An error occurred - delete-notification.js - getNotificationMembershipID()\n');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Deletes the specified notification.
async function deleteNotifications(notificationID, notificationMembershipID) {
  const params = {
    TransactItems: [
      {
        Delete: {
          TableName: 'Notifications',
          Key: {
            id: notificationID,
          },
        },
      },
      {
        Delete: {
          TableName: 'Users_Notifications',
          Key: {
            id: notificationMembershipID,
          },
        },
      },
    ],
  };

  try {
    await dynamoDbClient.transactWrite(params).promise();
    return 'Success';
  } catch (err) {
    console.log('\nAn error occurred - delete-notification.js - deleteNotifications()');
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
