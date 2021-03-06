const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {v4: uuidv4} = require('uuid');

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


router.post('/', authenticate, async function(req, res) {
  const result = await createRoom(req.body);

  if (result === 'ERROR-OCCURRED') {
    res.status(500).send('Couldn\'t create room');
    return;
  }


  if (req.body.groupRoom) {
    const groupMemberIDs = await getGroupMemberIDs(req.body.groupID);

    if (result === 'ERROR-OCCURRED') {
      res.status(404).send('Couldn\'t retrieve group member ids');
      return;
    }


    for (let i = 0; i < groupMemberIDs.length; i++) {
      const status = await createRoomMembership(groupMemberIDs[i], req.body.id, req.body.groupID);

      if (status === 'ERROR-OCCURRED') {
        res.status(500).send('Couldn\'t create room membership');
        return;
      }
    }
  } else {
    let status = await createRoomMembership(req.body.user1ID, req.body.id, 'null');

    if (status === 'ERROR-OCCURRED') {
      res.status(500).send('Couldn\'t create room membership');
      return;
    }

    status = await createRoomMembership(req.body.user2ID, req.body.id, 'null');

    if (status === 'ERROR-OCCURRED') {
      res.status(500).send('Couldn\'t create room membership');
      return;
    }
  }

  res.status(200).send('Success');
});


// Creates the specified room.
async function createRoom(room) {
  const params = {
    TableName: 'Rooms',
    Item: {
      id: room.id,
      groupID: room.groupID,
      name: room.name,
      purpose: room.purpose,
      creator: room.creator,
      date: room.date,
      time: room.time,
    },
  };

  try {
    await dynamoDbClient.put(params).promise();
    return 'Success';
  } catch (err) {
    return 'ERROR-OCCURRED';
  }
}


// Retrieves the ids of the members of the specified group.
async function getGroupMemberIDs(groupID) {
  const params = {
    TableName: 'Users_Groups',
    IndexName: 'groupID-index',
    KeyConditionExpression: 'groupID = :gid',
    ExpressionAttributeValues: {
      ':gid': groupID,
    },
  };

  try {
    const response = await dynamoDbClient.query(params).promise();

    const groupMemberIDs = [];

    for (let i = 0; i < response.Items.length; i++) {
      groupMemberIDs.push(response.Items[i].userID);
    }

    return groupMemberIDs;
  } catch (err) {
    return 'ERROR-OCCURRED';
  }
}


// Creates a room membership using the data passed to this function.
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


/*
 * Checks if the object passed into the function is empty. If yes it returns
 * true, otherwise it returns false.
 */
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}


module.exports = router;
