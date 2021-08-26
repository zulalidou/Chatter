const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
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
    console.log('An error occurred - verify-password.js - authenticate()\n');
    console.log(err.message);
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
  const userInfo = await getUserInfo(req.query.userID);

  if (userInfo === 'ERROR-OCCURRED') {
    res.status(404).send('The requested resource was not found.');
    return;
  }


  if (await isPasswordCorrect(req.query.password, userInfo.password)) {
    res.status(200).send('Success');
  } else {
    res.status(500).send('Failure');
  }
});


/*
 * Retrieves the specified user's info.
 */
async function getUserInfo(userID) {
  const params = {
    TableName: 'Users',
    Key: {
      id: userID,
    },
  };

  try {
    const response = await dynamoDbClient.get(params).promise();
    return response.Item;
  } catch (err) {
    console.log('An error occurred - verify-password.js - getUserInfo()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


/*
 * Checks to see whether the password the user is provided is the same as the
 * password stored in their account.
 */
async function isPasswordCorrect(passwordEntered, passwordStored) {
  if (await bcrypt.compare(passwordEntered, passwordStored)) {
    return true;
  }

  return false;
}


/*
 * Checks if the object passed into the function is empty. If yes it returns
 * true, otherwise it returns false.
 */
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}


module.exports = router;
