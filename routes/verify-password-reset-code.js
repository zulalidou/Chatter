const express = require('express');
const router = express.Router();

const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-west-2',
  endpoint: 'https://dynamodb.us-west-2.amazonaws.com',
});

// a simplified client for interacting with DynamoDB
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();


router.get('/', async function(req, res) {
  const userInfo = await getUserInfo(req.query.email);

  if (userInfo === undefined) {
    res.status(500).send('Failure');
    return;
  }

  if (userInfo.resetCode === req.query.code) {
    deleteRowFromTable('PasswordChangeRequests', 'email', req.query.email);
    res.status(200).send('Success');
    return;
  }

  res.status(500).send('Failure');
});


/*
 * Retrieves the specified user's info.
 */
async function getUserInfo(email) {
  const params = {
    TableName: 'PasswordChangeRequests',
    Key: {
      email: email,
    },
  };

  try {
    const user = await dynamoDbClient.get(params).promise();
    return user.Item;
  } catch (err) {
    console.log('\n');
    console.log(err);
    return undefined;
  }
}


/*
 * Deletes the specified row, from the specified table.
 */
function deleteRowFromTable(table, key, value) {
  const params = {
    TableName: table,
    Key: {
      [key]: value,
    },
  };

  try {
    dynamoDbClient.delete(params).promise();
  } catch (err) {
    console.log('An error occurred');
    console.log(err);
  }
}


module.exports = router;
