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
    console.log('An error occurred - get-user2-data.js - authenticate()\n');
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
  const user2ID = await getUser2ID(req.query.roomID, req.query.user1ID);

  if (user2ID === 'ERROR-OCCURRED') {
    res.status(404).send('The requested resource was not found.');
    return;
  }


  const user2username = await getUsername(user2ID);

  if (user2username === 'ERROR-OCCURRED') {
    res.status(404).send('The requested resource was not found.');
    return;
  }

  res.status(200).send({id: user2ID, username: user2username});
});


// Retrieves the user id of the user.
async function getUser2ID(roomID, user1ID) {
  const params = {
    TableName: 'Users_Rooms',
    IndexName: 'roomID-index',
    KeyConditionExpression: 'roomID = :rid',
    ExpressionAttributeValues: {
      ':rid': roomID,
    },
  };

  try {
    const response = await dynamoDbClient.query(params).promise();

    if (response.Items[0].userID === user1ID) {
      return response.Items[1].userID;
    }
    return response.Items[0].userID;
  } catch (err) {
    console.log('An error has occurred - get-user2-data.js - getUser2ID()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Retrieves the username of the specified user.
async function getUsername(userID) {
  const params = {
    TableName: 'Users',
    Key: {
      id: userID,
    },
  };

  try {
    const response = await dynamoDbClient.get(params).promise();
    return response.Item.username;
  } catch (err) {
    console.log('An error has occurred - get-user2-data.js - getUsername()');
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
