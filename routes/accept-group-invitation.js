const express = require('express');
const router = express.Router();
const {v4: uuidv4} = require('uuid');
const jwt = require('jsonwebtoken');

const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-west-2',
  endpoint: 'https://dynamodb.us-west-2.amazonaws.com',
});
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


/*
 * 1. Make sure that before the user accepts the group invitation, the group
 *    hasn't been deleted yet.
 * 2. If it has been deleted, don't do anything, otherwise, add the user as a
 *    new member of the group
 */
router.post('/', authenticate, async function(req, res) {
  const groupExists = await doesGroupExist(req.body.groupID);

  if (groupExists === 'ERROR-OCCURRED') {
    res.status(404).send('Couldn\'t retrieve data');
    return;
  }


  const userIsAlreadyMember = await isUserAlreadyMember(req.body.userID, req.body.groupID);

  if (userIsAlreadyMember === 'ERROR-OCCURRED') {
    res.status(404).send('Couldn\'t retrieve data');
    return;
  }


  if (userIsAlreadyMember) {
    res.status(200).end('User is already member');
    return;
  }

  let status = await createGroupMembership(req.body.userID, req.body.groupID);

  if (status === 'ERROR-OCCURRED') {
    res.status(500).send('Couldn\'t create group membership');
    return;
  }


  const roomIDs = await getRoomIDs(req.body.groupID);

  if (roomIDs === 'ERROR-OCCURRED') {
    res.status(404).send('Couldn\'t retrieve data');
    return;
  }


  for (let i = 0; i < roomIDs.length; i++) {
    status = await createRoomMembership(req.body.userID, roomIDs[i], req.body.groupID);

    if (status === 'ERROR-OCCURRED') {
      res.status(404).send('Couldn\'t retrieve data');
      return;
    }
  }


  res.status(200).send('Success');
});


// Determines whether or not the specified group exists.
async function doesGroupExist(groupID) {
  const params = {
    TableName: 'Groups',
    Key: {
      id: groupID,
    },
  };


  try {
    const response = await dynamoDbClient.get(params).promise();
    const group = response.Item;

    if (isEmpty(group)) {
      return false;
    }
    return true;
  } catch (err) {
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


// Determines whether or not the specified user is a member of the specified group.
async function isUserAlreadyMember(userID, groupID) {
  const params = {
    TableName: 'Users_Groups',
    IndexName: 'userID-index',
    KeyConditionExpression: 'userID = :uid',
    ExpressionAttributeValues: {
      ':uid': userID,
    },
  };

  try {
    const response = await dynamoDbClient.query(params).promise();

    for (let i = 0; i < response.Items.length; i++) {
      if (response.Items[i].groupID === groupID) {
        return true;
      }
    }

    return false;
  } catch (err) {
    return 'ERROR-OCCURRED';
  }
}


// Creates a group membership using the data provided.
async function createGroupMembership(userID, groupID) {
  const params = {
    TableName: 'Users_Groups',
    Item: {
      id: uuidv4(),
      userID: userID,
      groupID: groupID,
      date: getDate(),
      time: getTime(),
    },
  };

  try {
    await dynamoDbClient.put(params).promise();
    return 'Success';
  } catch (err) {
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


// Retrieves the current time.
function getTime() {
  const dateObj = new Date();
  return dateObj.getTime();
}


// Retrieves the room ids of the specified group.
async function getRoomIDs(groupID) {
  const params = {
    TableName: 'Rooms',
    IndexName: 'groupID-index',
    KeyConditionExpression: 'groupID = :gid',
    ExpressionAttributeValues: {
      ':gid': groupID,
    },
  };

  try {
    const response = await dynamoDbClient.query(params).promise();

    const roomIDs = [];

    for (let i = 0; i < response.Items.length; i++) {
      roomIDs.push(response.Items[i].id);
    }

    return roomIDs;
  } catch (err) {
    return 'ERROR-OCCURRED';
  }
}


// Creates a room membership using the data provided.
async function createRoomMembership(userID, roomID, groupID) {
  const params = {
    TableName: 'Users_Rooms',
    Item: {
      id: uuidv4(),
      userID: userID,
      roomID: roomID,
      groupID: groupID,
    },
  };

  try {
    await dynamoDbClient.put(params).promise();
    return 'Success';
  } catch (err) {
    return 'ERROR-OCCURRED';
  }
}


module.exports = router;
