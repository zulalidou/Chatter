const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const jwtDecode = require('jwt-decode');

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
    console.log('An error occurred - logout.js - authenticate()\n');
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
  const loggedInInfo = await getUserInfo(req.body.userID);

  if (loggedInInfo === 'ERROR-OCCURRED') {
    res.status(404).send('Couldn\'t retrieve user info');
    return;
  }


  if (!req.body.sessionEnded) {
    const status = await blacklistJWT(loggedInInfo.jwt, jwtDecode(loggedInInfo.jwt).expirationTime);

    if (status === 'ERROR-OCCURRED') {
      res.status(500).send('Couldn\'t blacklist jwt');
      return;
    }
  }


  status = await removeUserFromList(req.body.userID);

  if (status === 'ERROR-OCCURRED') {
    res.status(500).send('Couldn\'t remove user from list of logged-in users');
    return;
  }


  status = await deleteRandomRooms(req.body.userID);

  if (status === 'ERROR-OCCURRED') {
    res.status(500).send('Couldn\'t delete random rooms');
    return;
  }


  status = closeCurrentRoom(req.body.userID);

  if (status === 'ERROR-OCCURRED') {
    res.status(500).send('Couldn\'t remove user from list of logged-in users');
    return;
  }


  if (req.cookies.jwtHP !== undefined) res.clearCookie('jwtHP');
  if (req.cookies.jwtS !== undefined) res.clearCookie('jwtS');


  res.status(200).send();
});


// Retrieves the user's info.
async function getUserInfo(userID) {
  const params = {
    TableName: 'LoggedInUsers',
    Key: {
      id: userID,
    },
  };

  try {
    const response = await dynamoDbClient.get(params).promise();
    return response.Item;
  } catch (err) {
    console.log('\nAn error has occurred - logout.js - getUserInfo()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Blacklists the JWT token.
async function blacklistJWT(token, expirationTime) {
  const params = {
    TableName: 'BlacklistedJWTs',
    Item: {
      jwt: token,
      timeToLive: expirationTime,
    },
  };

  try {
    await dynamoDbClient.put(params).promise();
    return 'Success';
  } catch (err) {
    console.log('\nAn error has occurred - logout.js - blacklistJWT()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Removes the row in the LoggedInUsers table that contains the user's data.
async function removeUserFromList(userID) {
  const params = {
    TableName: 'LoggedInUsers',
    Key: {
      id: userID,
    },
  };

  try {
    await dynamoDbClient.delete(params).promise();
    return 'Success';
  } catch (err) {
    console.log('An error occurred - logout.js - removeUserFromList()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Deletes all the random rooms the user is a member of.
async function deleteRandomRooms(userID) {
  const roomIDs = await getRandomRoomIDs(userID);

  if (roomIDs === 'ERROR-OCCURRED') {
    return 'ERROR-OCCURRED';
  }


  for (let i = 0; i < roomIDs.length; i++) {
    let status = await deleteMessages(roomIDs[i]);

    if (status === 'ERROR-OCCURRED') {
      return 'ERROR-OCCURRED';
    }


    status = await deleteNotifications(roomIDs[i]);

    if (status === 'ERROR-OCCURRED') {
      return 'ERROR-OCCURRED';
    }


    status = await deleteRoomMemberships(roomIDs[i]);

    if (status === 'ERROR-OCCURRED') {
      return 'ERROR-OCCURRED';
    }


    status = await deleteRow('Rooms', roomIDs[i]);

    if (status === 'ERROR-OCCURRED') {
      return 'ERROR-OCCURRED';
    }
  }

  return 'Success';
}


// Retrieves all the ids of the random rooms the user is a member of.
async function getRandomRoomIDs(userID) {
  const params = {
    TableName: 'Users_Rooms',
    IndexName: 'userID-index',
    KeyConditionExpression: 'userID = :uid',
    ExpressionAttributeValues: {
      ':uid': userID,
    },
  };

  try {
    const response = await dynamoDbClient.query(params).promise();
    const roomIDs = [];

    for (let i = 0; i < response.Items.length; i++) {
      if (response.Items[i].groupID === 'null') {
        roomIDs.push(response.Items[i].roomID);
      }
    }

    return roomIDs;
  } catch (err) {
    console.log('An error occurred - logout.js - getRandomRoomIDs()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Deletes all of the messages in the specified room.
async function deleteMessages(roomID) {
  const messageIDs = await getRoomMessageIDs(roomID);

  if (messageIDs === 'ERROR-OCCURRED') {
    return 'ERROR-OCCURRED';
  }

  for (let i = 0; i < messageIDs.length; i++) {
    const status = await deleteRow('Messages', messageIDs[i]);

    if (status === 'ERROR-OCCURRED') {
      return 'ERROR-OCCURRED';
    }
  }

  return 'Success';
}


// Retrieves the ids of all the messages in the room specified.
async function getRoomMessageIDs(roomID) {
  const params = {
    TableName: 'Messages',
    IndexName: 'roomID-index',
    KeyConditionExpression: 'roomID = :rid',
    ExpressionAttributeValues: {
      ':rid': roomID,
    },
  };

  try {
    const response = await dynamoDbClient.query(params).promise();

    const messageIDs = [];

    for (let i = 0; i < response.Items.length; i++) {
      messageIDs.push(response.Items[i].id);
    }
    return messageIDs;
  } catch (err) {
    console.log('An error occurred - logout.js - getRoomMessageIDs()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Deletes the specified row in the specified table.
async function deleteRow(tableName, primaryKey) {
  const params = {
    TableName: tableName,
    Key: {
      id: primaryKey,
    },
  };

  try {
    await dynamoDbClient.delete(params).promise();
    return 'Success';
  } catch (err) {
    console.log('An error occurred - logout.js - deleteRow()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Deletes notifications from the specified room.
async function deleteNotifications(roomID) {
  const notificationIDs = await getNotificationIDs(roomID);

  if (notificationIDs === 'ERROR-OCCURRED') {
    return 'ERROR-OCCURRED';
  }

  for (let i = 0; i < notificationIDs.length; i++) {
    let status = await deleteRow('Notifications', notificationIDs[i]);

    if (status === 'ERROR-OCCURRED') {
      return 'ERROR-OCCURRED';
    }


    const userNotificationID = await getUserNotificationID(notificationIDs[i]);

    if (userNotificationID === 'ERROR-OCCURRED') {
      return 'ERROR-OCCURRED';
    }


    status = await deleteRow('Users_Notifications', userNotificationID);

    if (status === 'ERROR-OCCURRED') {
      return 'ERROR-OCCURRED';
    }
  }

  return 'Success';
}


// Retrieves notifications from the specified room.
async function getNotificationIDs(roomID) {
  const params = {
    TableName: 'Notifications',
    IndexName: 'roomID-index',
    KeyConditionExpression: 'roomID = :rid',
    ExpressionAttributeValues: {
      ':rid': roomID,
    },
  };

  try {
    const response = await dynamoDbClient.query(params).promise();

    const notificationIDs = [];

    for (let i = 0; i < response.Items.length; i++) {
      notificationIDs.push(response.Items[i].id);
    }
    return notificationIDs;
  } catch (err) {
    console.log('An error occurred - logout.js - getNotificationIDs()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Retrieves the notification id of a notification.
async function getUserNotificationID(notificationID) {
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
    console.log('An error occurred - logout.js - getUserNotificationID()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


// Deletes the membership of the user from the specified room.
async function deleteRoomMemberships(roomID) {
  const roomMembershipIDs = await getRoomMembershipIDs(roomID);

  if (roomMembershipIDs === 'ERROR-OCCURRED') {
    return 'ERROR-OCCURRED';
  }

  for (let i = 0; i < roomMembershipIDs.length; i++) {
    const status = await deleteRow('Users_Rooms', roomMembershipIDs[i]);

    if (status === 'ERROR-OCCURRED') {
      return 'ERROR-OCCURRED';
    }
  }

  return 'Success';
}


/*
 * Retrieves the ids that represent the memberships of all of the users of the
 * specified room.
 */
async function getRoomMembershipIDs(roomID) {
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

    const roomMembershipIDs = [];

    for (let i = 0; i < response.Items.length; i++) {
      roomMembershipIDs.push(response.Items[i].id);
    }

    return roomMembershipIDs;
  } catch (err) {
    console.log('An error has occurred - logout.js - getRoomMembershipIDs()');
    console.log(err);
    return 'ERROR-OCCURRED';
  }
}


/*
 * Closes the current room the user is in simply by setting the
 * 'currentRoomOpen' variable to null.
 */
async function closeCurrentRoom(userID) {
  const params = {
    TableName: 'Users',
    Key: {
      id: userID,
    },
    UpdateExpression: 'set #room = :n',
    ExpressionAttributeNames: {'#room': 'currentRoomOpen'},
    ExpressionAttributeValues: {
      ':n': null,
    },
  };

  try {
    await dynamoDbClient.update(params).promise();
    return 'Success';
  } catch (err) {
    console.log('\nAn error has occurred - logout.js - closeCurrentRoom()');
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
