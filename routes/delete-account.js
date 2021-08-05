const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const jwt_decode = require('jwt-decode')

const AWS = require('aws-sdk')
AWS.config.update({
    region: "us-west-2",
    endpoint: "https://dynamodb.us-west-2.amazonaws.com"
})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()


// ------------------------------------
// For accessing the SendInBlue API
const SibApiV3Sdk = require('sib-api-v3-sdk')
const defaultClient = SibApiV3Sdk.ApiClient.instance


// Configure API key authorization: api-key
const apiKey = defaultClient.authentications['api-key']
apiKey.apiKey = process.env.Sib_API_Key


async function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)


        // Now check to see if the jwt token is stored in the BlacklistedJWTs table
        // - If it is, then deny the request
        // - Otherwise, allow the request
        const tokenIsBlacklisted = await tokenBlacklisted(req.cookies.jwtHP + "." + req.cookies.jwtS)

        if (tokenIsBlacklisted === "ERROR-OCCURRED") {
            res.status(401).send("An error occurred")
            return
        }

        if (tokenIsBlacklisted) {
            res.status(401).send("The token was blacklisted")
            return
        }
    } catch (err) {
        console.log(err.message)
        res.status(401).send(err.message)
        return
    }

    next()
}


async function tokenBlacklisted(jwt) {
    const params = {
        TableName: "BlacklistedJWTs",
        Key: {
            jwt: jwt
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        const jwt = response.Item

        if (isEmpty(jwt))
            return false
        return true
    } catch (err) {
        return "ERROR-OCCURRED"
    }
}


router.post('/', authenticate, async function(req, res) {
    const userInfo = await getUserInfo(req.body.id)

    if (userInfo === null) {
        res.status(404).send("The requested resource was not found.")
        return
    }

    sendEmailNotification(userInfo.email, userInfo.name.split(" ")[0])

    deleteContact(userInfo.email)



    let status = undefined

    status = await modifyMessages(userInfo.id)

    if (status === null) {
        res.status(500).send("An error occurred")
        return
    }



    status = await removeUserFromGroups(req.body.id)

    if (status === null) {
        res.status(500).send("Could not delete user.")
        return
    }



    status = await deleteRandomChat(userInfo.id)

    if (status === null) {
        res.status(500).send("Could not delete user.")
        return
    }




    status = await deleteNotifications(req.body.id)

    if (status === null) {
        res.status(500).send("Could not delete notifications.")
        return
    }

    await deleteUser(req.body.id)
    await deleteTableRow("LoggedInUsers", "id", req.body.id)



    blacklistJWT(req.cookies.jwtHP + "." + req.cookies.jwtS, jwt_decode(req.cookies.jwtHP).expirationTime)
    res.clearCookie("jwtHP")

    res.status(200).end("Success")
})



// 1. Get all of the groups that the user is a member of. Iterate over them 1 by 1.
// 2. Remove the user from each individual group (in table Users_Groups)
// 3. Get a list of all the members that are still in the current group. If there are none, go to the next step,
//    otherwise, delete everything related to that group (including its rooms, messages, and notifications)
async function removeUserFromGroups(userID) {
    const groupData = await getGroupData(userID)

    if (groupData === null)
        return null

    const groupMembershipIDs = groupData.groupMembershipIDs
    const groupIDs = groupData.groupIDs

    for (let i = 0; i < groupMembershipIDs.length; i++) {
        await deleteTableRow("Users_Groups", "id", groupMembershipIDs[i])


        // NOW:
        // 1. Go to Users_Rooms and grab all of the IDs of the rows that belong to this group AND to this user
        // 2. Iterate over those IDs, and delete those rows one by one

        const groupRoomsMembershipIDs = await getGroupRoomMembershipIDs(userID, groupIDs[i])

        for (let i = 0; i < groupRoomsMembershipIDs.length; i++)
            await deleteTableRow("Users_Rooms", "id", groupRoomsMembershipIDs[i])


        const groupIsEmpty = await isGroupEmpty(groupIDs[i])

        if (groupIsEmpty === null)
            return null

        if (groupIsEmpty) {
            const status = await deleteGroupData(groupIDs[i])

            if (status === null)
                return null
        }
    }
}


async function getGroupRoomMembershipIDs(userID, groupID) {
    const params = {
        TableName: 'Users_Rooms',
        IndexName: "userID-index",
        KeyConditionExpression: "userID = :uid",
        ExpressionAttributeValues: {
            ":uid" : userID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()

        let groupRoomMembershipIDs = []

        for (let i = 0; i < response.Items.length; i++) {
            if (response.Items[i].groupID === groupID)
                groupRoomMembershipIDs.push(response.Items[i].id)
        }

        return groupRoomMembershipIDs
    } catch (err) {
        console.log("An error occurred - delete-account.js - getGroupRoomMembershipIDs()")
        console.log(err)
        return null
    }
}


async function getGroupData(userID) {
    const params = {
        TableName: 'Users_Groups',
        IndexName: "userID-index",
        KeyConditionExpression: "userID = :uid",
        ExpressionAttributeValues: {
            ":uid" : userID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()

        let groupMembershipIDs = []
        let groupIDs = []

        for (let i = 0; i < response.Items.length; i++) {
            groupMembershipIDs.push(response.Items[i].id)
            groupIDs.push(response.Items[i].groupID)
        }

        return {
            groupMembershipIDs: groupMembershipIDs,
            groupIDs: groupIDs
        }
    } catch (err) {
        console.log("An error occurred - delete-account.js - getGroupData()")
        console.log(err)
        return null
    }
}


async function isGroupEmpty(groupID) {
    const params = {
        TableName: "Users_Groups",
        IndexName: "groupID-index",
        KeyConditionExpression: "groupID = :gid",
        ExpressionAttributeValues: {
            ":gid": groupID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()

        if (response.Items.length > 0)
            return false
        return true
    } catch (err) {
        console.log("An error occurred - delete-account.js - isGroupEmpty()")
        console.log(err)
        return null
    }
}


async function deleteGroupData(groupID) {
    // 1. Grab all of the rooms that are part of this group, and delete them
    // 2. Grab all of the messages that are part of this group, and delete them
    // 3. Remove all notifications related to this group from the Notifications and Users_Notifications tables
    // 4. Remove group from Groups table

    await deleteGroupRooms(groupID)
    await deleteGroupMessages(groupID)
    const status = await deleteGroupNotifications(groupID)

    if (status === null)
        return null

    await deleteGroup(groupID)

    return "Success"
}


async function deleteGroupRooms(groupID) {
    const groupRoomsIDs = await getIDs("Rooms", groupID)

    for (let i = 0; i < groupRoomsIDs.length; i++)
        await deleteTableRow("Rooms", "id", groupRoomsIDs[i])



    // ---------
    // NOW I NEED TO GRAB ALL OF THE ROWS IN THE USERS_ROOMS TABLE WHERE
    // X.GROUPID === groupID

    const groupRoomsMembershipIDs = await getIDs("Users_Rooms", groupID)

    for (let i = 0; i < groupRoomsMembershipIDs.length; i++)
        await deleteTableRow("Users_Rooms", "id", groupRoomsMembershipIDs[i])
}


async function getIDs(tableName, groupID) {
    const params = {
        TableName: tableName,
        IndexName: "groupID-index",
        KeyConditionExpression: "groupID = :gid",
        ExpressionAttributeValues: {
            ":gid": groupID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        const IDs = []

        for (let i = 0; i < response.Items.length; i++)
            IDs.push(response.Items[i].id)
        return IDs
    } catch (err) {
        console.log("An error has occurred - delete-account.js - getGroupRoomIDs")
        console.log(err)
        return []
    }
}


async function deleteGroupMessages(groupID) {
    const groupMessagesIDs = await getIDs("Messages", groupID)

    for (let i = 0; i < groupMessagesIDs.length; i++)
        await deleteTableRow("Messages", "id", groupMessagesIDs[i])
}


async function deleteGroupNotifications(groupID) {
    const notificationIDs = await getGroupNotificationIDs(groupID)

    for (let i = 0; i < notificationIDs.length; i++) {
        const userNotificationID = await getUserNotificationID(notificationIDs[i])

        if (userNotificationID === null)
            return null

        await deleteTableRow("Users_Notifications", "id", userNotificationID)
        await deleteTableRow("Notifications", "id", notificationIDs[i])
    }
}


async function getGroupNotificationIDs(groupID) {
    const params = {
        TableName: "Notifications",
        IndexName: "groupID-index",
        KeyConditionExpression: "groupID = :gid",
        ExpressionAttributeValues: {
            ":gid": groupID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        let notificationIDs = []

        for (let i = 0; i < response.Items.length; i++)
            notificationIDs.push(response.Items[i].id)
        return notificationIDs
    } catch (err) {
        console.log("An error occurred - delete-account.js - getGroupNotificationIDs()")
        console.log(err)
        return []
    }
}


async function getUserNotificationID(notificationID) {
    const params = {
        TableName: "Users_Notifications",
        IndexName: "notificationID-index",
        KeyConditionExpression: "notificationID = :nid",
        ExpressionAttributeValues: {
            ":nid": notificationID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()

        // There should only be 1 item in the "Items" array returned
        return response.Items[0].id
    } catch (err) {
        console.log("An error occurred - delete-account.js - getUserNotificationID()")
        console.log(err)
        return null
    }
}


async function deleteGroup(groupID) {
    const params = {
        TableName: "Groups",
        Key: {
            id: groupID
        }
    }

    try {
        await DynamoDB_client.delete(params).promise()
    } catch (err) {
        console.log("An error has occurred - delete-account.js - deleteGroup()")
        console.log(err)
    }
}


async function deleteTableRow(table, key, value) {
    const params = {
        TableName: table,
        Key: {
            [key]: value
        }
    }

    try {
        await DynamoDB_client.delete(params).promise()
        return "Success"
    } catch (err) {
        console.log("\nAn error occurred - delete-account.js - deleteTableRow()")
        console.log(err)
        return null
    }
}


async function deleteNotifications(userID) {
    const notifications = await getNotifications(userID)

    if (notifications === null)
        return null

    for (let i = 0; i < notifications.length; i++) {
        await deleteTableRow('Users_Notifications', 'id', notifications[i].id)
        await deleteTableRow('Notifications', 'id', notifications[i].notificationID)
    }
}


async function getNotifications(userID) {
    const params = {
        TableName: 'Users_Notifications',
        IndexName: 'userID-index',
        KeyConditionExpression: 'userID = :uid',
        ExpressionAttributeValues: {
            ':uid': userID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        return response.Items
    } catch (err) {
        console.log("An error occurred - delete-account.js - getNotifications()\n")
        console.log(err)
        return null
    }
}


async function deleteUser(userID) {
    await deleteTableRow('Users', 'id', userID)
}


async function getUserInfo(userID) {
    const params = {
        TableName: "Users",
        Key: {
            id: userID
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        return response.Item
    } catch (err) {
        console.log("\nAn error occurred - delete-account.js - getUserInfo()")
        console.log(err)
        return null
    }
}


async function sendEmailNotification(email, firstName) {
    const api = new SibApiV3Sdk.TransactionalEmailsApi()
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()

    sendSmtpEmail = {
        to: [{
            email: email
        }],
        templateId: 7,
        params: {
            firstName: firstName
        },
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }

    api.sendTransacEmail(sendSmtpEmail).then(
      function(data) {}
    , function(error) {
        console.log("\n\nAn error has occurred - delete-account.js - sendEmailNotification()")
        console.error(error)
    })
}


function blacklistJWT(token, expirationTime) {
    const params = {
        TableName: "BlacklistedJWTs",
        Item: {
            jwt: token.split(".")[2], // storing the signature part of the token/JWT
            timeToLive: expirationTime
        }
    }

    try {
        DynamoDB_client.put(params).promise()
    } catch (err) {
        console.log("\n\nAn error occurred - delete-account.js - blacklistJWT()")
        console.log(err)
    }
}


// When a user is going through the process of deleting their account, this function
// grabs all of the data relating to the messages (whether in groups or random-chat)
// this user has ever sent, and modifies some of their attribute in order to show that
// they can no longer be attributed to their original creator - since their account is about
// to be deleted.
async function modifyMessages(userID) {
    // 1. Grab all of the messages of the user. Call it X.
    // 2. Loop over X, and set X[i].senderID = null AND X[i].username = [USER-NOT-FOUND]
    // 3. Save X back into the Messages table

    const messagesInfo = await getMessagesInfo(userID)

    if (messagesInfo === null)
        return null

    for (let i = 0; i < messagesInfo.length; i++) {
        messagesInfo[i].senderID = "null"
        messagesInfo[i].username = "[USER-NOT-FOUND]"

        const state = await saveMessagesInfo(messagesInfo[i])

        if (state === null)
            return null
    }

    return "Success"
}


async function getMessagesInfo(userID) {
    const params = {
        TableName: "Messages",
        IndexName: "senderID-index",
        KeyConditionExpression: "senderID = :sid",
        ExpressionAttributeValues: {
            ":sid" : userID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        return response.Items
    } catch (err) {
        console.log("An error occurred - delete-account.js - getGroupData()")
        console.log(err)
        return null
    }
}


async function saveMessagesInfo(messageInfo) {
    const params = {
        TableName: "Messages",
        Item: messageInfo
    }

    try {
        await DynamoDB_client.put(params).promise()
        return "Success"
    } catch (err) {
        console.log("\n\nAn error occurred - delete-account.js - saveMessagesInfo()")
        console.log(err)
        return null
    }
}


async function deleteContact(email) {
    const api = new SibApiV3Sdk.ContactsApi()

    await api.deleteContact(email)
        .then(async function() {
            console.log('\n\nContact deleted successfully.')
        }, function(error) {
            console.log(error)
        })
}


// Deletes the rooms and the messages that have to do with the current user in random-chat mode
async function deleteRandomChat(userID) {
    // 1. Grab rows from table Users_Rooms where userID === user's ID AND groupID === null. Call it X.
    // 2. Iterate over X. For each room ID in X, remove it from the Rooms table.
    // 3. For each room ID (from the previous step), get the IDs for all of the messages for that room. Then delete each of the messages one by one.

    const randomRoomIDs = await getRandomRoomIDs(userID)

    if (randomRoomIDs === null)
        return null

    for (let i = 0; i < randomRoomIDs.length; i++) {
        let status = await deleteTableRow("Rooms", "id", randomRoomIDs[i])

        if (status === null)
            return null

        const messageIDs = await getRandomRoomMessageIDs(randomRoomIDs[i])

        for (let j = 0; j < messageIDs.length; j++) {
            status = await deleteTableRow("Messages", "id", messageIDs[j])

            if (status === null)
                return null
        }
    }


    for (let i = 0; i < randomRoomIDs.length; i++) {
        const randomRoomMembershipIDs = await getRandomRoomMembershipIDs(randomRoomIDs[i])

        for (let i = 0; i < randomRoomMembershipIDs.length; i++) {
            let status = await deleteTableRow("Users_Rooms", "id", randomRoomMembershipIDs[i])

            if (status === null)
                return null
        }
    }
}


async function getRandomRoomIDs(userID) {
    const params = {
        TableName: 'Users_Rooms',
        IndexName: "userID-index",
        KeyConditionExpression: "userID = :uid",
        ExpressionAttributeValues: {
            ":uid" : userID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()

        let randomRoomIDs = []

        for (let i = 0; i < response.Items.length; i++) {
            if (response.Items[i].groupID === "null")
                randomRoomIDs.push(response.Items[i].roomID)
        }

        return randomRoomIDs
    } catch (err) {
        console.log("An error occurred - delete-account.js - getRandomRoomIDs()")
        console.log(err)
        return null
    }
}


async function getRandomRoomMessageIDs(roomID) {
    const params = {
        TableName: 'Messages',
        IndexName: "roomID-index",
        KeyConditionExpression: "roomID = :rid",
        ExpressionAttributeValues: {
            ":rid" : roomID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        let messageIDs = []

        for (let i = 0; i < response.Items.length; i++)
            messageIDs.push(response.Items[i].id)
        return messageIDs
    } catch (err) {
        console.log("An error occurred - delete-account.js - getRandomRoomMessageIDs()")
        console.log(err)
        return null
    }
}


async function getRandomRoomMembershipIDs(roomID) {
    const params = {
        TableName: 'Users_Rooms',
        IndexName: "roomID-index",
        KeyConditionExpression: "roomID = :rid",
        ExpressionAttributeValues: {
            ":rid" : roomID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        let randomRoomMembershipIDs = []

        for (let i = 0; i < response.Items.length; i++)
            randomRoomMembershipIDs.push(response.Items[i].id)
        return randomRoomMembershipIDs
    } catch (err) {
        console.log("An error occurred - delete-account.js - getRandomRoomMessageIDs()")
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


module.exports = router
