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
    console.log('An error occurred - delete-notification-2.js - authenticate()\n');
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
  const notificationMembershipID = await getNotificationMembershipID(req.query.notificationID);

  if (notificationMembershipID === 'ERROR-OCCURRED') {
    res.status(404).send('The requested resource was not found.');
    return;
  }


  const status = await deleteNotifications(req.query.notificationID, notificationMembershipID);

  if (status === 'ERROR-OCCURRED') {
    res.status(404).send('The requested resource was not found.');
    return;
  }


  res.status(200).send('Success');
});


// Retrieves the membership id of the specified notification.
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
    return response.Items[0].id;
  } catch (err) {
    console.log('An error occurred - delete-notification.js - getNotificationMembershipID()\n');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Delets the specified notification.
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
