const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2', endpoint: 'https://dynamodb.us-west-2.amazonaws.com'});
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
    console.log('An error occurred - get-groups.js - authenticate()\n');
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
  const groupMemberships = await getGroupMemberships(req.query.userID);

  if (groupMemberships === 'ERROR-OCCURRED') {
    res.status(404).send('Couldn\'t retrieve data');
    return;
  }

  const groups = [];

  for (let i = 0; i < groupMemberships.length; i++) {
    const groupInfo = await getGroupInfo(groupMemberships[i].groupID);

    if (groupInfo === 'ERROR-OCCURRED') {
      res.status(404).send('Couldn\'t retrieve data');
      return;
    }

    groups.push(groupInfo);
  }

  res.status(200).send(groups);
});


// Retrieves the group memberships the specified user is a part of.
async function getGroupMemberships(userID) {
  const params = {
    TableName: 'Users_Groups',
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
    console.log('\n');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Retrieves the specified group's info.
async function getGroupInfo(id) {
  const params = {
    TableName: 'Groups',
    Key: {
      id: id,
    },
  };

  try {
    const groups = await dynamoDbClient.get(params).promise();
    return groups.Item;
  } catch (err) {
    console.log('\n');
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
