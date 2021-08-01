// if (process.env.NODE_ENV !== 'production')
require('dotenv').config()

const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server) // the server from the 'socket.io' module

const expressLayouts = require('express-ejs-layouts')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const helmet = require('helmet')
const csrf = require('csurf')
// const csrfProtection = csrf({
//     cookie: {
//         key: "CSRF-Token",
//         secure: true,
//         sameSite: "strict"
//     }
// })



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
app.use(cookieParser())
app.use(helmet())
app.disable("x-powered-by")



const sendActivationCodeRoute = require('./routes/send-account-activation-code')
const verifyAccountActivationCodeRoute = require('./routes/verify-account-activation-code')
const sendPasswordResetCodeRoute = require('./routes/send-password-reset-code')
const loginRoute = require('./routes/login')
const verifyPasswordResetCodeRoute = require('./routes/verify-password-reset-code')
const setNewPasswordRoute = require('./routes/set-new-password')
const signupRoute = require('./routes/signup')
const loggedInUsersRoute = require('./routes/get-logged-in-users')
const getAccountInfoRoute = require('./routes/get-profile-info')
const getUserFieldInfoRoute = require('./routes/get-user-field-info')
const getNotificationsRoute = require('./routes/get-notifications')
const verifyPasswordRoute = require('./routes/verify-password')
const verifyAccountExistsRoute = require('./routes/verify-account-exists')
const getGroupMembersRoute = require('./routes/get-group-members')
const getGroupsRoute = require('./routes/get-groups')
const getGroupRoomsRoute = require('./routes/get-group-rooms')
const getRoomMessagesRoute = require('./routes/get-room-messages')
const getUserIDRoute = require('./routes/get-user-id')
const notificationCheckRoute = require('./routes/notification-check')
const getGroupRoute = require('./routes/get-group')
const checkIfRoomExistsRoute = require('./routes/check-if-room-exists')
const isUserGroupMemberRoute = require('./routes/is-user-group-member')
const isRandomRoomRoute = require('./routes/is-random-room')
const getUser2DataRoute = require('./routes/get-user2-data')
const getGroupNumberRoute = require('./routes/get-group-number')
const didUserReceiveInviteRoute = require('./routes/did-user-receive-invite')
const deleteNotificationRoute = require('./routes/delete-notification')
const deleteNotification2Route = require('./routes/delete-notification-2')

app.use('/api/send-account-activation-code', sendActivationCodeRoute)
app.use('/api/verify-account-activation-code', verifyAccountActivationCodeRoute)
app.use('/api/send-password-reset-code', sendPasswordResetCodeRoute)
app.use('/api/login', loginRoute)
app.use('/api/verify-password-reset-code', verifyPasswordResetCodeRoute)
app.use('/api/set-new-password', setNewPasswordRoute)
app.use('/api/signup', signupRoute)
app.use('/api/get-logged-in-users', loggedInUsersRoute)
app.use('/api/get-profile-info', getAccountInfoRoute)
app.use('/api/get-user-field-info', getUserFieldInfoRoute)
app.use('/api/get-notifications', getNotificationsRoute)
app.use('/api/verify-password', verifyPasswordRoute)
app.use('/api/verify-account-exists', verifyAccountExistsRoute)
app.use('/api/get-group-members', getGroupMembersRoute)
app.use('/api/get-groups', getGroupsRoute)
app.use('/api/get-group-rooms', getGroupRoomsRoute)
app.use('/api/get-room-messages', getRoomMessagesRoute)
app.use('/api/get-user-id', getUserIDRoute)
app.use('/api/notification-check', notificationCheckRoute)
app.use('/api/get-group', getGroupRoute)
app.use('/api/check-if-room-exists', checkIfRoomExistsRoute)
app.use('/api/is-user-group-member', isUserGroupMemberRoute)
app.use('/api/is-random-room', isRandomRoomRoute)
app.use('/api/get-user2-data', getUser2DataRoute)
app.use('/api/get-group-number', getGroupNumberRoute)
app.use('/api/did-user-receive-invite', didUserReceiveInviteRoute)
app.use('/api/delete-notification', deleteNotificationRoute)
app.use('/api/delete-notification-2', deleteNotification2Route)



const acceptGroupInviteRoute = require('./routes/accept-group-invitation')
const becomeAdminRoute = require('./routes/become-admin')
const createGroupRoute = require('./routes/create-group')
const createRoomRoute = require('./routes/create-room')
const deleteAccountRoute = require('./routes/delete-account')
const leaveGroupRoute = require('./routes/leave-group')
const logoutRoute = require('./routes/logout')
const saveMessageToDbRoute = require('./routes/save-message-to-db')
const sendNotificationRoute = require('./routes/send-notification')
const setUserInfoRoute = require('./routes/set-user-info')

app.use('/api/accept-group-invitation', acceptGroupInviteRoute)
app.use('/api/become-admin', becomeAdminRoute)
app.use('/api/create-group', createGroupRoute)
app.use('/api/create-room', createRoomRoute)
app.use('/api/delete-account', deleteAccountRoute)
app.use('/api/leave-group', leaveGroupRoute)
app.use('/api/logout', logoutRoute)
app.use('/api/save-message-to-db', saveMessageToDbRoute)
app.use('/api/send-notification', sendNotificationRoute)
app.use('/api/set-user-info', setUserInfoRoute)


app.use(
    csrf({
        cookie: {
            secure: true,
            httpOnly: true,
            sameSite: "strict"
        }
    })
)


app.get('/*', (req,res) => {
    res.cookie('XSRF-TOKEN', req.csrfToken())
    res.sendFile(path.join(__dirname, '/client/build/index.html'))
})



// app.use(function (err, req, res, next) {
//     console.log("\n\n\nSERVER-CSRF-ERROR-CALLBACK:")
//     console.log(err.code)
//     console.log("------------------------------------------------")
//     console.log("cookies names:")
//     console.log(req.cookies)
//     console.log("------------------------------------------------\n")
//
//
//     if (err.code !== 'EBADCSRFTOKEN') return next(err)
//
//
//
//     // handle CSRF token errors here
//     res.status(403)
//     res.send('form tampered with')
// })




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

            sendUserTheNotification(notification.id, member.id, notification.timeToLive)
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
    console.log("\n\n\nsaveTheNotification()")
    console.log("notification to be saved: ")
    console.log(notification)
    console.log("---------------------------------------\n\n")


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


function sendUserTheNotification(notificationID, userID, timeToLive) {
    const params = {
        TableName: 'Users_Notifications',
        Item: {
            id: uuidv4(),
            userID: userID,
            notificationID: notificationID,
            timeToLive: timeToLive
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

        sendUserTheNotification(notification.id, recipient.id, notification.timeToLive)
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
            timeToLive: Math.ceil(getTime() / 1000) + (60 * 60 * 24 * 7) // 7 days from now (in seconds)
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

        date: data.date,
        time: data.time,
        timeToLive: Math.ceil(getTime() / 1000) + (60 * 60 * 24)  // 1 day from now (in milliseconds)
    }
}



function getTime() {
    const today = new Date()
    return today.getTime()
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
        return users.Item
    } catch (err) {
        console.log("An error occurred (home.js)")
        console.log(err)
        return null
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
        return user.Item
    } catch (err) {
        console.log('\n')
        console.log(err)
        return undefined
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



// There are too many files where "getUserInfo()" & "setUserInfo()" and other very similar functions are made.
// There should be just 1 file/route that stores these functions, and they should be called from there.
