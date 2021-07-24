// if (process.env.NODE_ENV !== 'production')
require('dotenv').config()

const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server, {
  cors: {
    origin: "https://chatter-client.vercel.app", //"http://localhost:3000",
    credentials: true,
    // allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'X-Access-Token', 'Authorization'],
    methods: ["GET", "POST"]
  }
}) // the server from the 'socket.io' module

const expressLayouts = require('express-ejs-layouts')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const path = require('path')
const cors = require('cors')
const { v4: uuidv4 } = require('uuid')

const corsOptions = {
  origin: "https://chatter-client.vercel.app", //'http://localhost:3000',
  credentials: true,
  // allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'X-Access-Token', 'Authorization'],
  methods: ['GET', 'POST']
  // optionsSuccessStatus: 200
}


const AWS = require('aws-sdk')
AWS.config.update({
    region: "us-west-2",
    endpoint: "https://dynamodb.us-west-2.amazonaws.com"
})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()


app.use(express.static(path.join(__dirname, '/client/build')))


app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(expressLayouts)
app.use(bodyParser.urlencoded({extended: true}))
app.use(cors(corsOptions))
app.use(cookieParser())


app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, '/client/build/index.html'))
})





const landingRoute = require('./routes/landing')
const loginRoute = require('./routes/login')
const signupRoute = require('./routes/signup')
const logoutRoute = require('./routes/logout')
const createGroupRoute = require('./routes/create-group')
const createRoomRoute = require('./routes/create-room')
const loggedInUsersRoute = require('./routes/get-logged-in-users')
const saveMessageToDbRoute = require('./routes/save-message-to-db')
const getAccountInfoRoute = require('./routes/get-profile-info')
const getUserFieldInfoRoute = require('./routes/get-user-field-info')
const setUserInfoRoute = require('./routes/set-user-info')
const sendNotificationRoute = require('./routes/send-notification')
const getNotificationsRoute = require('./routes/get-notifications')
const acceptGroupInviteRoute = require('./routes/accept-group-invitation')
const verifyPasswordRoute = require('./routes/verify-password')
const verifyAccountExistsRoute = require('./routes/verify-account-exists')
const deleteAccountRoute = require('./routes/delete-account')
const getGroupMembersRoute = require('./routes/get-group-members')
const verifyAccountActivationCodeRoute = require('./routes/verify-account-activation-code')
const sendActivationCodeRoute = require('./routes/send-account-activation-code')
const sendPasswordResetCodeRoute = require('./routes/send-password-reset-code')
const verifyPasswordResetCodeRoute = require('./routes/verify-password-reset-code')
const getGroupsRoute = require('./routes/get-groups')
const getGroupRoomsRoute = require('./routes/get-group-rooms')
const getRoomMessagesRoute = require('./routes/get-room-messages')
const getUserIDRoute = require('./routes/get-user-id')
const notificationCheckRoute = require('./routes/notification-check')
const leaveGroupRoute = require('./routes/leave-group')
const becomeAdminRoute = require('./routes/become-admin')
const getGroupRoute = require('./routes/get-group')
const checkIfRoomExistsRoute = require('./routes/check-if-room-exists')
const isUserGroupMemberRoute = require('./routes/is-user-group-member')
const isRandomRoomRoute = require('./routes/is-random-room')
const getUser2DataRoute = require('./routes/get-user2-data')
const getGroupNumberRoute = require('./routes/get-group-number')
const didUserReceiveInviteRoute = require('./routes/did-user-receive-invite')
const deleteNotificationRoute = require('./routes/delete-notification')
const deleteNotification2Route = require('./routes/delete-notification-2')
const setNewPasswordRoute = require('./routes/set-new-password')


app.use('/', landingRoute)
app.use('/login', loginRoute)
app.use('/signup', signupRoute)
app.use('/logout', logoutRoute)
app.use('/create-group', createGroupRoute)
app.use('/create-room', createRoomRoute)
app.use('/get-logged-in-users', loggedInUsersRoute)
app.use('/save-message-to-db', saveMessageToDbRoute)
app.use('/get-profile-info', getAccountInfoRoute)
app.use('/get-user-field-info', getUserFieldInfoRoute)
app.use('/set-user-info', setUserInfoRoute)
app.use('/send-notification', sendNotificationRoute)
app.use('/get-notifications', getNotificationsRoute)
app.use('/accept-group-invitation', acceptGroupInviteRoute)
app.use('/verify-password', verifyPasswordRoute)
app.use('/verify-account-exists', verifyAccountExistsRoute)
app.use('/delete-account', deleteAccountRoute)
app.use('/get-group-members', getGroupMembersRoute)
app.use('/verify-account-activation-code', verifyAccountActivationCodeRoute)
app.use('/send-account-activation-code', sendActivationCodeRoute)
app.use('/send-password-reset-code', sendPasswordResetCodeRoute)
app.use('/verify-password-reset-code', verifyPasswordResetCodeRoute)
app.use('/get-groups', getGroupsRoute)
app.use('/get-group-rooms', getGroupRoomsRoute)
app.use('/get-room-messages', getRoomMessagesRoute)
app.use('/get-user-id', getUserIDRoute)
app.use('/notification-check', notificationCheckRoute)
app.use('/leave-group', leaveGroupRoute)
app.use('/become-admin', becomeAdminRoute)
app.use('/get-group', getGroupRoute)
app.use('/check-if-room-exists', checkIfRoomExistsRoute)
app.use('/is-user-group-member', isUserGroupMemberRoute)
app.use('/is-random-room', isRandomRoomRoute)
app.use('/get-user2-data', getUser2DataRoute)
app.use('/get-group-number', getGroupNumberRoute)
app.use('/did-user-receive-invite', didUserReceiveInviteRoute)
app.use('/delete-notification', deleteNotificationRoute)
app.use('/delete-notification-2', deleteNotification2Route)
app.use('/set-new-password', setNewPasswordRoute)



const PORT = process.env.PORT || 8000

server.listen(PORT, () => {
    console.log(`\nListening to port ${PORT}\n\n`)
})




// Maps usernames to their respective client sockets
let connectedClients = {}


// Every time a user loads up our website, this function gets called. It also gives each of these users their own socket.
// Through these sockets, we can send messages down to the users.
io.on('connection', function(clientSocket) {
    console.log('\nconnected')


    clientSocket.on('link-username-to-socket', username => {
        console.log('link-username-to-socket')

        connectedClients[username] = {socket: clientSocket}
        clientSocket.username = username
    })

    clientSocket.on('join-room', roomID => {
        console.log('join-room')
        clientSocket.join(roomID)
    })

    clientSocket.on('leave-room', roomID => {
        console.log('leave-room')
        console.log(roomID + '\n')

        clientSocket.leave(roomID)
    })


    clientSocket.on('send-message-to-group-room', async data => {
        // data:
        // - senderID
        // - message
        // - roomID
        // - roomName
        // - groupID
        // - groupName
        // - date
        // - time


        const userInfo = await getUserInfo(data.senderID)

        // 1. Paste message in room
        io.to(data.roomID).emit(data.roomID, {
            senderID: data.senderID,
            username: userInfo.username,
            avatarString: userInfo.avatarString,
            message: data.message,
            date: data.date,
            time: data.time
        })


        // 2. Iterate over the members of the room. If at any point a member is away from the room,
        //    send them a notification
        sendNotificationsToGroupMembers(data)
    })


    clientSocket.on('send-message-to-random-room', async data => {
        // data:
        // - senderID
        // - message
        // - roomID
        // - groupID
        // - date
        // - time
        // - recipientID


        const roomStillExists = await roomExists(data.roomID)

        if (!roomStillExists) {
            io.to(data.roomID).emit(data.roomID, {
                senderID: "N/A",
                message: "THE OTHER USER HAS DISCONNECTED."
            })

            return
        }



        const userInfo = await getUserInfo(data.senderID)

        // 1. Paste message in room
        io.to(data.roomID).emit(data.roomID, {
            senderID: data.senderID,
            username: userInfo.username,
            avatarString: userInfo.avatarString,
            message: data.message,
            date: data.date,
            time: data.time
        })


        // 2. Check to see if the recipient (of the message) is active in the room. If no, send them
        //    a notification
        sendNotificationsToRandomRoomMember(data)
    })




    clientSocket.on('disconnect', function() {
        delete connectedClients[clientSocket.username]
    })
})



async function sendNotificationsToGroupMembers(data) {
    console.log('\nsendNotificationsToGroupMembers() called')
    console.log(data)

    const notification = await createNotification("group-room-message", data)
    const roomMembers = await getRoomMembers(data.groupID)
    let notificationSaved = false


    for (let i = 0; i < roomMembers.length; i++) {
        const member = await getUserInfo(roomMembers[i])

        if (member.id === data.senderID)
            continue

        console.log(member)

        const userGotNotification = await userAlreadyGotNotification(member.id, "group-room-message", data.roomID)

        if (member.currentRoomOpen !== data.roomID && !userGotNotification) {
            if (!notificationSaved) {
                saveTheNotification(notification)
                notificationSaved = true
            }

            sendUserTheNotification(notification.id, member.id)
            console.log('notification sent')
        }
        else {
            console.log('\n\nELSE CONDITION LOGGED')
        }
    }

    console.log('---------------------------------------------')
}


async function getRoomMembers(groupID) {
    const params = {
        TableName: 'Users_Groups',
        IndexName: 'groupID-index',
        KeyConditionExpression: 'groupID = :gid',
        ExpressionAttributeValues: {
            ':gid': groupID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        const roomMemberships = response.Items

        let roomMembers = []

        for (let i = 0; i < roomMemberships.length; i++)
            roomMembers.push(roomMemberships[i].userID)

        return roomMembers
    } catch (err) {
        console.log('An error occurred - server.js - getRoomMembers()\n')
        console.log(err)
        return []
    }
}


function saveTheNotification(notification) {
    const params = {
        TableName: 'Notifications',
        Item: notification
    }

    try {
        DynamoDB_client.put(params).promise()
    } catch (err) {
        console.log('An error occurred - server.js - saveTheNotification()\n')
        console.log(err)
        return
    }
}


function sendUserTheNotification(notificationID, userID) {
    const params = {
        TableName: 'Users_Notifications',
        Item: {
            id: uuidv4(),
            notificationID: notificationID,
            userID: userID
        }
    }

    try {
        DynamoDB_client.put(params).promise()
    } catch (err) {
        console.log("An error occurred - server.js - sendUserTheNotification()\n")
        console.log(err)
        return
    }
}







async function sendNotificationsToRandomRoomMember(data) {
    console.log('\n\nsendNotificationsToRandomRoomMember() called')
    console.log(data)
    console.log("+++++++++++++++++++++++++++++++++++++++++++=\n\n")

    const notification = await createNotification("random-room-message", data)
    const recipient = await getUserInfo(data.recipientID)
    console.log("\nrecipient:")
    console.log(recipient)
    console.log("+++++++++++++++++++++++++++++++++++++++++++=\n\n")

    const userGotNotification = await userAlreadyGotNotification(recipient.id, "random-room-message", data.roomID)
    console.log("userGotNotification = " + userGotNotification)
    console.log("recipient.currentRoomOpen = " + recipient.currentRoomOpen)
    console.log("data.roomID = " + data.roomID)


    if (recipient.currentRoomOpen !== data.roomID && !userGotNotification) {
        console.log("\n\n")
        console.log(recipient)
        console.log(")))))))))))))))))))))))))))))))")
        console.log("userGotNotification = " + userGotNotification)

        sendUserTheNotification(notification.id, recipient.id)
        saveTheNotification(notification)
    }
}



async function createNotification(type, data) {
    if (type === "group-room-message") {
        return {
            id: uuidv4(),
            type: "group-room-message",
            message: "You have some unread messages in room " + data.roomName + " of group " + data.groupName,

            senderID: data.senderID,
            recipientID: "null",

            groupID: data.groupID,
            groupName: data.groupName,
            roomID: data.roomID,
            roomName: data.roomName,

            date: data.date,
            time: getTime(),
            expirationTime: getTime() + 604800000 // 7 days from now (in milliseconds)
        }
    }


    return { // 'random-room-message'
        id: uuidv4(),
        type: "random-room-message",
        message: "You have received a message from " + data.username,

        senderID: data.senderID,
        recipientID: data.recipientID,

        groupID: "null",
        groupName: "null",
        roomID: data.roomID,
        roomName: data.username,

        // icon: data.avatarString,
        date: data.date,
        time: data.time,
        expirationTime: getTime() + (60000 * 60 * 24)  // 1 day from now (in milliseconds)
    }
}


// async function getUsername(id) {
//     const params = {
//         TableName: "Users",
//         Key: {
//             id: id
//         }
//     }
//
//     try {
//         const user = await DynamoDB_client.get(params).promise()
//         return user.Item.username
//     } catch (err) {
//         console.log('\n')
//         console.log(err)
//         return undefined
//     }
// }


function getTime() {
    const today = new Date()
    return today.getTime()
}


async function saveNotification(notification) {
    console.log('\n\nsaveNotification() -- server.js')
    console.log(notification)
    console.log('--------------------------------------------------------')

    const params = {
        TableName: 'Notifications',
        Item: notification
    }

    console.log('\nsave the DAMN notification')
    console.log(notification)

    try {
        await DynamoDB_client.put(params).promise()
        console.log('notification has been saved whippee!!')
    } catch (err) {
        console.log('\n\nAn error occurred (server.js - line 403)')
        console.log(err)
    }
}


async function getUserInfo(id) {
    const params = {
        TableName: "Users",
        Key: {
            id: id
        }
    }

    try {
        const users = await DynamoDB_client.get(params).promise()
        // console.log(users)
        return users.Item
    } catch (err) {
        console.log("An error occurred (home.js)")
        console.log(err)
        return null
    }
}


async function getGroupInfo(id) {
    const params = {
        TableName: 'Groups',
        Key: {
            id: id,
        }
    }

    try {
        const user = await DynamoDB_client.get(params).promise()
        return user.Item
    } catch (err) {
        console.log('\n')
        console.log(err)
        return undefined
    }
}


async function getGroupInfo(id) {
    const params = {
        TableName: 'Groups',
        Key: {
            id: id,
        }
    }

    try {
        const user = await DynamoDB_client.get(params).promise()
        return user.Item
    } catch (err) {
        console.log('\n')
        console.log(err)
        return undefined
    }
}


function saveUserInfo(userInfo) {
    console.log('\n\n@@@@@@@@@@@@loggy loggy saveUserInfo()')

    const params = {
        TableName: 'Users',
        Item: userInfo
    }

    try {
        DynamoDB_client.put(params).promise()
    } catch (err) {
        console.log('An error occurred (create-group.js)')
        console.log(err)
    }
}


async function userAlreadyGotNotification(userID, notificationType, roomID) {
    console.log("\n\nuserAlreadyGotNotification() called")
    const notificationIDs = await getNotificationIDs(userID)
    console.log(notificationIDs)

    for (let i = 0; i < notificationIDs.length; i++) {
        const notification = await getNotification(notificationIDs[i])
        console.log(notification)

        if (notification.type === notificationType && notification.roomID === roomID)
            return true
    }

    return false
}


async function getNotificationIDs(userID) {
    const params = {
        TableName: "Users_Notifications",
        IndexName: "userID-index",
        KeyConditionExpression: "userID = :uid",
        ExpressionAttributeValues: {
            ":uid": userID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        let notificationIDs = []

        // console.log('\n\ngetNotificationIDs() called')
        // console.log(response)

        for (let i = 0; i < response.Items.length; i++)
            notificationIDs.push(response.Items[i].notificationID)
        return notificationIDs
    } catch (err) {
        console.log("An error occurred - server.js - getNotificationIDs()")
        console.log(err)
        return []
    }
}


async function getNotification(id) {
    const params = {
        TableName: 'Notifications',
        Key: {
            id: id
        }
    }

    try {
        const user = await DynamoDB_client.get(params).promise()
        // console.log('\n========================================')
        // console.log(user.Item)
        // console.log('========================================\n')

        return user.Item
    } catch (err) {
        console.log('\n')
        console.log(err)
        return undefined
    }
}


// async function getAccountID(username) {
//     const params = {
//         TableName: 'Users',
//         IndexName: 'username-index',
//         KeyConditionExpression: 'username = :username',
//         ExpressionAttributeValues: {
//           ':username': username,
//         }
//     }
//
//     try {
//         const user = await DynamoDB_client.query(params).promise()
//         return user.Items[0].account_id
//     } catch (err) {
//         console.log("An error occurred - A\n")
//         console.log(err)
//         return false
//     }
// }















async function saveRoomIdIntoSession(username, roomID) {
    // 1. Get user session info
    // 2. Append roomID to session info
    // 3. Save session info

    const session = await getSession(username)
    console.log('sess sess below:')
    console.log(session)

    session.random_roomIDs.push(roomID)
    saveSession(session)
}


async function getSession(username) {
    const params = {
        TableName: 'Sessions',
        Key: {
            username: username
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        return response.Item
    } catch (err) {
        console.log('An error has occurred\n')
        console.log(err)
        return false
    }
}


function saveSession(session) {
    const params = {
        TableName: 'Sessions',
        Item: session
    }

    try {
        DynamoDB_client.put(params).promise()
    } catch (err) {
        console.log('An error occurred (account.js)')
        console.log(err)
    }
}













async function subscribeToRandomRooms(username, clientSocket) {
    const rooms = await getRandomRooms(username)
    console.log('rooms: ')
    console.log(rooms)

    for (let i = 0; i < rooms.length; i++) {
        console.log('Joining room = ' + rooms[i])
        clientSocket.join(rooms[i])
    }

    console.log('All random rooms have been joined')
}


async function getRandomRooms(username) {
    const params = {
        TableName: 'Sessions',
        Key: {
            username: username
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        return response.Item.random_roomIDs
    } catch (err) {
        console.log('An error has occurred\n')
        console.log(err)
        return false
    }
}





async function getSocketInfo(username) {
    const params = {
        TableName: 'SocketInfo',
        Key: {
            username: username
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()

        if (response.Item == undefined)
            return null
        return response.Item
    } catch (err) {
        console.log('An error has occurred\n')
        console.log(err)
        return false
    }
}









async function getRoomInfo(id) {
    const params = {
        TableName: 'RandomChatrooms',
        Key: {
            id: id
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()

        if (response.Item === undefined)
            return null
        return response.Item
    } catch (err) {
        console.log('An error has occurred\n')
        console.log(err)
        return false
    }
}


// Checks if the room still exists. This is in case the other user logged out of the account
// (which would delete this room in the process)
async function roomExists(roomID) {
    const params = {
        TableName: "Rooms",
        Key: {
            id: roomID
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        console.log(response)

        if (isEmpty(response))
            return false
        return true
    } catch (err) {
        console.log("An error has occurred - server.js - roomExists()")
        console.log(err)
        return null
    }
}



function isEmpty(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false
    }

    return true
}














// async function subscribeToRooms(clientSocket, username, groupIDs) {
//     for (let i = 0; i < groupIDs.length; i++) {
//         let group = await getGroupInfo(groupIDs[i])
//
//         for (const roomID in group.rooms) {
//             for (let i = 0; i < group.rooms[roomID].members.length; i++) {
//                 if (group.rooms[roomID].members[i].username === username)
//                     clientSocket.join(roomID)
//             }
//         }
//     }
// }
//
//
//
//
//
//
//
//
//
//
//
//
//
// async function getGroupInfo(groupID) {
//     let groupInfo = null
//
//     // const redisGet = await Promise.promisify(groups_redisClient.get, {context: groups_redisClient})
//     //
//     // await redisGet(groupID).then(function(result) {
//     //     groupInfo = JSON.parse(result)
//     // }).catch(function(error) {
//     //     console.log("Error in getGroupInfo() - (groups.js)")
//     // })
//
//     return groupInfo
// }
//
//
// function saveGroupInfo(groupInfo) {
//     // groups_redisClient.set(groupInfo.groupID, JSON.stringify(groupInfo), function(error) {
//     //     if (error)
//     //         console.log(error)
//     // })
// }
//
//
//
//
//
//
//
//
//
//
//
//
// function saveRoomInfo(roomID, roomInfo) {
//     // privateRooms_redisClient.set(roomID, JSON.stringify(roomInfo), function(error) {
//     //     if (error) {
//     //         console.log('An error occurred while trying to create a private room (account.js)')
//     //         console.log(error)
//     //     }
//     // })
// }
//
//
// function sendMessage(clientSocket, data) {
//     clientSocket.broadcast.to(data.roomID).emit('display-room-message', {message: data.message, sender: data.sender, roomID: data.roomID})
// }
//
//
// async function getUserInfo_fromSession(username) {
//     let userInfo = null
//
//     // const redisGet = await Promise.promisify(users_redisClient.get, {context: users_redisClient})
//     //
//     // await redisGet(username).then(function(result) {
//     //     userInfo = JSON.parse(result)
//     // }).catch(function(error) {
//     //     console.log(error)
//     // })
//
//     return userInfo
// }
//
//
// async function getUserInfo_fromDB(usernameProvided) {
//     const params = {
//         TableName: 'Users',
//         IndexName: 'username-index',
//         KeyConditionExpression: 'username = :uProvided',
//         ExpressionAttributeValues: {
//           ':uProvided': usernameProvided,
//         }
//     }
//
//     try {
//         const user = await DynamoDB_client.query(params).promise()
//         return user.Items[0]
//     } catch (err) {
//         console.log("An error occurred\n")
//         console.log(err)
//         return false
//     }
// }
//
//
// function saveUserInfo_intoSession(userInfo) {
//     // users_redisClient.set(userInfo.username, JSON.stringify(userInfo), function(error) {
//     //     if (error)
//     //         console.log(error)
//     // })
// }
//
//
// function saveUserInfo_intoDB(userInfo) {
//     const params = {
//         TableName: 'Users',
//         Item: userInfo
//     }
//
//     try {
//         DynamoDB_client.put(params).promise()
//     } catch (err) {
//         console.log('An error occurred')
//         console.log(err)
//     }
// }


// There are too many files where "getUserInfo()" & "setUserInfo()" and other very similar functions are made.
// There should be just 1 file/route that stores these functions, and they should be called from there.
