/*
 * @fileoverview This is the entry point of the app. It sets up the server,
 * it creates routes the app uses, and it handles the socket connection, which
 * allows communication between users.
 */

/*
 * If the app isn't in production mode, then it's most likely running in
 * development mode
 */
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}


// Modules used below
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const {v4: uuidv4} = require('uuid');
const helmet = require('helmet');
const csrf = require('csurf');
const AWS = require('aws-sdk');
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();

app.use(express.static(path.join(__dirname, '/client/build')));
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(helmet());
app.disable('x-powered-by');
AWS.config.update({
  region: 'us-west-2',
  endpoint: 'https://dynamodb.us-west-2.amazonaws.com',
});


// Routes below
const sendActivationCodeRoute = require('./routes/send-account-activation-code');
const verifyAccountActivationCodeRoute = require('./routes/verify-account-activation-code');
const sendPasswordResetCodeRoute = require('./routes/send-password-reset-code');
const loginRoute = require('./routes/login');
const verifyPasswordResetCodeRoute = require('./routes/verify-password-reset-code');
const setNewPasswordRoute = require('./routes/set-new-password');
const signupRoute = require('./routes/signup');
const loggedInUsersRoute = require('./routes/get-logged-in-users');
const getAccountInfoRoute = require('./routes/get-profile-info');
const getUserFieldInfoRoute = require('./routes/get-user-field-info');
const getNotificationsRoute = require('./routes/get-notifications');
const verifyPasswordRoute = require('./routes/verify-password');
const verifyAccountExistsRoute = require('./routes/verify-account-exists');
const getGroupMembersRoute = require('./routes/get-group-members');
const getGroupsRoute = require('./routes/get-groups');
const getGroupRoomsRoute = require('./routes/get-group-rooms');
const getRoomMessagesRoute = require('./routes/get-room-messages');
const getUserIDRoute = require('./routes/get-user-id');
const notificationCheckRoute = require('./routes/notification-check');
const getGroupRoute = require('./routes/get-group');
const checkIfRoomExistsRoute = require('./routes/check-if-room-exists');
const isUserGroupMemberRoute = require('./routes/is-user-group-member');
const isRandomRoomRoute = require('./routes/is-random-room');
const getUser2DataRoute = require('./routes/get-user2-data');
const getGroupNumberRoute = require('./routes/get-group-number');
const didUserReceiveInviteRoute = require('./routes/did-user-receive-invite');
const deleteNotificationRoute = require('./routes/delete-notification');
const deleteNotification2Route = require('./routes/delete-notification-2');
const acceptGroupInviteRoute = require('./routes/accept-group-invitation');
const becomeAdminRoute = require('./routes/become-admin');
const createGroupRoute = require('./routes/create-group');
const createRoomRoute = require('./routes/create-room');
const deleteAccountRoute = require('./routes/delete-account');
const leaveGroupRoute = require('./routes/leave-group');
const logoutRoute = require('./routes/logout');
const saveMessageToDbRoute = require('./routes/save-message-to-db');
const sendNotificationRoute = require('./routes/send-notification');
const setUserInfoRoute = require('./routes/set-user-info');

app.use('/api/accept-group-invitation', acceptGroupInviteRoute);
app.use('/api/become-admin', becomeAdminRoute);
app.use('/api/create-group', createGroupRoute);
app.use('/api/create-room', createRoomRoute);
app.use('/api/delete-account', deleteAccountRoute);
app.use('/api/leave-group', leaveGroupRoute);
app.use('/api/logout', logoutRoute);
app.use('/api/save-message-to-db', saveMessageToDbRoute);
app.use('/api/send-notification', sendNotificationRoute);
app.use('/api/set-user-info', setUserInfoRoute);
app.use('/api/send-account-activation-code', sendActivationCodeRoute);
app.use('/api/verify-account-activation-code', verifyAccountActivationCodeRoute);
app.use('/api/send-password-reset-code', sendPasswordResetCodeRoute);
app.use('/api/login', loginRoute);
app.use('/api/verify-password-reset-code', verifyPasswordResetCodeRoute);
app.use('/api/set-new-password', setNewPasswordRoute);
app.use('/api/signup', signupRoute);
app.use('/api/get-logged-in-users', loggedInUsersRoute);
app.use('/api/get-profile-info', getAccountInfoRoute);
app.use('/api/get-user-field-info', getUserFieldInfoRoute);
app.use('/api/get-notifications', getNotificationsRoute);
app.use('/api/verify-password', verifyPasswordRoute);
app.use('/api/verify-account-exists', verifyAccountExistsRoute);
app.use('/api/get-group-members', getGroupMembersRoute);
app.use('/api/get-groups', getGroupsRoute);
app.use('/api/get-group-rooms', getGroupRoomsRoute);
app.use('/api/get-room-messages', getRoomMessagesRoute);
app.use('/api/get-user-id', getUserIDRoute);
app.use('/api/notification-check', notificationCheckRoute);
app.use('/api/get-group', getGroupRoute);
app.use('/api/check-if-room-exists', checkIfRoomExistsRoute);
app.use('/api/is-user-group-member', isUserGroupMemberRoute);
app.use('/api/is-random-room', isRandomRoomRoute);
app.use('/api/get-user2-data', getUser2DataRoute);
app.use('/api/get-group-number', getGroupNumberRoute);
app.use('/api/did-user-receive-invite', didUserReceiveInviteRoute);
app.use('/api/delete-notification', deleteNotificationRoute);
app.use('/api/delete-notification-2', deleteNotification2Route);
app.use(
    csrf({
      cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
      },
    }),
);


app.get('/*', (req, res) => {
  res.cookie('XSRF-TOKEN', req.csrfToken());
  res.sendFile(path.join(__dirname, '/client/build/index.html'));
});


const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`\nListening to port ${PORT}\n\n`);
});


// Maps usernames to their respective client sockets
const connectedClients = {};

/*
 * Every time users load up the app, this function gets called and it gives each
 * of the users their own socket. It's through these sockets that users can send
 * and receive messages.
 */
io.on('connection', function(clientSocket) {
  console.log('\nsocket connection created');

  clientSocket.on('link-username-to-socket', (username) => {
    connectedClients[username] = {socket: clientSocket};
    clientSocket.username = username;
  });

  clientSocket.on('join-room', (roomID) => {
    clientSocket.join(roomID);
  });

  clientSocket.on('leave-room', (roomID) => {
    clientSocket.leave(roomID);
  });

  clientSocket.on('send-message-to-group-room', async (data) => {
    /* data:
     * - senderID
     * - message
     * - roomID
     * - roomName
     * - groupID
     * - groupName
     * - date
     * - time
     */

    const userInfo = await getUserInfo(data.senderID);

    // 1. Paste message in room
    io.to(data.roomID).emit(data.roomID, {
      senderID: data.senderID,
      username: userInfo.username,
      avatarString: userInfo.avatarString,
      message: data.message,
      date: data.date,
      time: data.time,
    });

    /*
     * 2. Iterate over the members of the room. If at any point a member is away
     *    from the room, send them a notification
     */
    sendNotificationsToGroupMembers(data);
  });


  clientSocket.on('send-message-to-random-room', async (data) => {
    /* data:
     * - senderID
     * - message
     * - roomID
     * - groupID
     * - date
     * - time
     * - recipientID
     */

    const roomStillExists = await roomExists(data.roomID);

    if (!roomStillExists) {
      io.to(data.roomID).emit(data.roomID, {
        senderID: 'N/A',
        message: 'THE OTHER USER HAS DISCONNECTED.',
      });

      return;
    }

    const userInfo = await getUserInfo(data.senderID);

    // 1. Paste message in room
    io.to(data.roomID).emit(data.roomID, {
      senderID: data.senderID,
      username: userInfo.username,
      avatarString: userInfo.avatarString,
      message: data.message,
      date: data.date,
      time: data.time,
    });

    /*
     * 2. Check to see if the recipient (of the message) is active in the room.
     *    If no, send them a notification
     */
    sendNotificationsToRandomRoomMember(data);
  });

  clientSocket.on('disconnect', function() {
    delete connectedClients[clientSocket.username];
  });
});


/*
 * If members of a group room X are absent, and someone posts a message in
 * group room X, this functions sends a notification to all members of group
 * room X who missed the new message in the room.
 */
async function sendNotificationsToGroupMembers(data) {
  // console.log('\nsendNotificationsToGroupMembers() called');
  // console.log(data);

  const notification = await createNotification('group-room-message', data);
  const roomMembers = await getRoomMembers(data.groupID);
  let notificationSaved = false;

  for (let i = 0; i < roomMembers.length; i++) {
    const member = await getUserInfo(roomMembers[i]);

    if (member.id === data.senderID) {
      continue;
    }

    // console.log(member);

    const userGotNotification = await userAlreadyGotNotification(member.id, 'group-room-message', data.roomID);

    if (member.currentRoomOpen !== data.roomID && !userGotNotification) {
      if (!notificationSaved) {
        saveTheNotification(notification);
        notificationSaved = true;
      }

      sendUserTheNotification(notification.id, member.id, notification.timeToLive);
      console.log('notification sent');
    } else {
      console.log('\n\nELSE CONDITION LOGGED');
    }
  }
}


/*
 * Gets the members from the group room specified.
 */
async function getRoomMembers(groupID) {
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
    const roomMemberships = response.Items;

    const roomMembers = [];

    for (let i = 0; i < roomMemberships.length; i++) {
      roomMembers.push(roomMemberships[i].userID);
    }

    return roomMembers;
  } catch (err) {
    console.log('An error occurred - server.js - getRoomMembers()\n');
    console.log(err);
    return [];
  }
}


/*
 * Saves the notification into the Notifications table.
 */
function saveTheNotification(notification) {
  // console.log('\n\n\nsaveTheNotification()');
  // console.log('notification to be saved: ');
  // console.log(notification);
  // console.log('---------------------------------------\n\n');

  const params = {
    TableName: 'Notifications',
    Item: notification,
  };

  try {
    dynamoDbClient.put(params).promise();
  } catch (err) {
    console.log('An error occurred - server.js - saveTheNotification()\n');
    console.log(err);
    return;
  }
}


/*
 * Gets the user specied a notification.
 */
function sendUserTheNotification(notificationID, userID, timeToLive) {
  const params = {
    TableName: 'Users_Notifications',
    Item: {
      id: uuidv4(),
      userID: userID,
      notificationID: notificationID,
      timeToLive: timeToLive,
    },
  };

  try {
    dynamoDbClient.put(params).promise();
  } catch (err) {
    console.log('An error occurred - server.js - sendUserTheNotification()\n');
    console.log(err);
    return;
  }
}


/*
 * Gets the members from the group room specified.
 */
async function sendNotificationsToRandomRoomMember(data) {
  // console.log('\n\nsendNotificationsToRandomRoomMember() called');
  // console.log(data);
  // console.log('+++++++++++++++++++++++++++++++++++++++++++=\n\n');

  const notification = await createNotification('random-room-message', data);
  const recipient = await getUserInfo(data.recipientID);
  // console.log('\nrecipient:');
  // console.log(recipient);
  // console.log('+++++++++++++++++++++++++++++++++++++++++++=\n\n');

  const userGotNotification = await userAlreadyGotNotification(recipient.id, 'random-room-message', data.roomID);
  // console.log('userGotNotification = ' + userGotNotification);
  // console.log('recipient.currentRoomOpen = ' + recipient.currentRoomOpen);
  // console.log('data.roomID = ' + data.roomID);

  if (recipient.currentRoomOpen !== data.roomID && !userGotNotification) {
    // console.log('\n\n');
    // console.log(recipient);
    // console.log(')))))))))))))))))))))))))))))))');
    // console.log('userGotNotification = ' + userGotNotification);
    sendUserTheNotification(notification.id, recipient.id, notification.timeToLive);
    saveTheNotification(notification);
  }
}


/*
 * Creates a notification and returns it.
 */
async function createNotification(type, data) {
  if (type === 'group-room-message') {
    return {
      id: uuidv4(),
      type: 'group-room-message',
      message: `You have some unread messages in room ${data.roomName} of group ${data.groupName}`,
      senderID: data.senderID,
      recipientID: 'null',
      groupID: data.groupID,
      groupName: data.groupName,
      roomID: data.roomID,
      roomName: data.roomName,
      date: data.date,
      time: getTime(),

      // 7 days from now (in seconds)
      timeToLive: Math.ceil(getTime() / 1000) + (60 * 60 * 24 * 7),
    };
  }


  // 'random-room-message'
  return {
    id: uuidv4(),
    type: 'random-room-message',
    message: `You have received a message from ${data.username}`,
    senderID: data.senderID,
    recipientID: data.recipientID,
    groupID: 'null',
    groupName: 'null',
    roomID: data.roomID,
    roomName: data.username,
    date: data.date,
    time: data.time,

    // 1 day from now (in milliseconds)
    timeToLive: Math.ceil(getTime() / 1000) + (60 * 60 * 24),
  };
}


/*
 * Retrieves the current time/
 */
function getTime() {
  const today = new Date();
  return today.getTime();
}


/*
 * Retrieves the user's info.
 */
async function getUserInfo(id) {
  const params = {
    TableName: 'Users',
    Key: {
      id: id,
    },
  };

  try {
    const users = await dynamoDbClient.get(params).promise();
    return users.Item;
  } catch (err) {
    console.log('An error occurred (home.js)');
    console.log(err);
    return null;
  }
}


/*
 * Checks to see if the user has received a specific notification. If yes it
 * returns true, otherwise it returns false.
 */
async function userAlreadyGotNotification(userID, notificationType, roomID) {
  // console.log('\n\nuserAlreadyGotNotification() called');
  const notificationIDs = await getNotificationIDs(userID);
  // console.log(notificationIDs);

  for (let i = 0; i < notificationIDs.length; i++) {
    const notification = await getNotification(notificationIDs[i]);
    // console.log(notification);

    if (notification.type === notificationType && notification.roomID === roomID) {
      return true;
    }
  }

  return false;
}


/*
 * Retrieves the ids of the user's notifications.
 */
async function getNotificationIDs(userID) {
  const params = {
    TableName: 'Users_Notifications',
    IndexName: 'userID-index',
    KeyConditionExpression: 'userID = :uid',
    ExpressionAttributeValues: {
      ':uid': userID,
    },
  };

  try {
    const response = await dynamoDbClient.query(params).promise();
    const notificationIDs = [];

    for (let i = 0; i < response.Items.length; i++) {
      notificationIDs.push(response.Items[i].notificationID);
    }
    return notificationIDs;
  } catch (err) {
    console.log('An error occurred - server.js - getNotificationIDs()');
    console.log(err);
    return [];
  }
}


/*
 * Retrieves the notification with the id specified.
 */
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
    console.log('\n');
    console.log(err);
    return undefined;
  }
}


/*
 * Checks if the room still exists. This is in case the other user logged out of
 * the account (which would delete this room in the process).
 */
async function roomExists(roomID) {
  const params = {
    TableName: 'Rooms',
    Key: {
      id: roomID,
    },
  };

  try {
    const response = await dynamoDbClient.get(params).promise();

    if (isEmpty(response)) {
      return false;
    }
    return true;
  } catch (err) {
    console.log('An error has occurred - server.js - roomExists()');
    console.log(err);
    return null;
  }
}


/*
 * Checks if the object passed into the function is empty. If yes it returns
 * true, otherwise it returns false.
 */
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}


/*
 * There are too many files where "getUserInfo()" & "setUserInfo()" and other
 * very similar functions are made. There should be just 1 file/route that
 * stores these functions, and they should be called from there.
 */
