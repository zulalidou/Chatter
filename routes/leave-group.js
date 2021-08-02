const express = require("express")
const router = express.Router()
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()



function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - leave-group.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.post("/", authenticate, async function(req, res) {
    let status = null

    status = await removeUserFromGroup(req.body.userID, req.body.groupID)

    if (status === "ERROR-OCCURRED") {
        res.status(500).send("Couldn't remove user from group")
        return
    }


    status = await removeUserFromRooms(req.body.userID, req.body.groupID)

    if (status === "ERROR-OCCURRED") {
        res.status(500).send("Couldn't remove user from rooms")
        return
    }


    status = await deleteUserGroupNotifications(req.body.userID, req.body.groupID)

    if (status === "ERROR-OCCURRED") {
        res.status(500).send("Couldn't delete user's group notifications")
        return
    }



    const groupMembersNumber = await getGroupMembersNumber(req.body.groupID)

    if (groupMembersNumber === "ERROR-OCCURRED") {
        res.status(404).send("Couldn't retrieve number of members left in the group")
        return
    }

    if (groupMembersNumber === 0) {
        status = await deleteGroupData(req.body.groupID)

        if (status === "ERROR-OCCURRED") {
            res.status(500).send("Couldn't delete the group data")
            return
        }
    }
    else {
        const groupInfo = await getGroupInfo(req.body.groupID)

        if (groupInfo === "ERROR-OCCURRED") {
            res.status(404).send("Couldn't retrieve group info")
            return
        }


        if (groupInfo.creator === req.body.userID)
            groupInfo.creator = null

        if (groupInfo.admin === req.body.userID)
            groupInfo.admin = null


        const saveStatus = await saveGroupInfo(groupInfo)

        if (saveStatus === "ERROR-OCCURRED") {
            res.status(404).send("Couldn't retrieve number of members left in the group")
            return
        }
    }


    res.status(200).send("Success")
})


async function removeUserFromGroup(userID, groupID) {
    const groupMemberships = await getGroupMemberships(userID)

    if (groupMemberships === "ERROR-OCCURRED")
        return "ERROR-OCCURRED"


    let membershipID = null

    for (let i = 0; i < groupMemberships.length; i++) {
        if (groupMemberships[i].groupID === groupID) {
            membershipID = groupMemberships[i].id
            break
        }
    }


    const params = {
        TableName: "Users_Groups",
        Key: {
            id: membershipID
        }
    }

    try {
        await DynamoDB_client.delete(params).promise()
        return "Success"
    } catch (err) {
        console.log("An error has occurred - leave-group.js - removeUserFromGroup()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function getGroupMemberships(userID) {
    const params = {
        TableName: "Users_Groups",
        IndexName: "userID-index",
        KeyConditionExpression: "userID = :uid",
        ExpressionAttributeValues: {
            ":uid": userID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        return response.Items
    } catch (err) {
        console.log("An error has occurred - leave-group.js - getGroupMemberships()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function removeUserFromRooms(userID, groupID) {
    // 1. Get room memberships (from Users_Rooms table) where obj.userID = user's userID. Call it X.
    // 2. Iterate over X. If X[i].groupID === groupID -> delete X[i]

    const roomMemberships = await getRoomMemberships(userID)

    if (roomMemberships === "ERROR-OCCURRED")
        return "ERROR-OCCURRED"


    for (let i = 0; i < roomMemberships.length; i++) {
        if (roomMemberships[i].groupID === groupID) {
            const status = await deleteRoomMembership(roomMemberships[i].id)

            if (status === "ERROR-OCCURRED")
                return "ERROR-OCCURRED"
        }
    }

    return "Success"
}


async function getRoomMemberships(userID) {
    const params = {
        TableName: "Users_Rooms",
        IndexName: "userID-index",
        KeyConditionExpression: "userID = :uid",
        ExpressionAttributeValues: {
            ":uid": userID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        return response.Items
    } catch (err) {
        console.log("An error has occurred - leave-group.js - getRoomMemberships()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function deleteRoomMembership(id) {
    const params = {
        TableName: "Users_Rooms",
        Key: {
            id: id
        }
    }

    try {
        await DynamoDB_client.delete(params).promise()
        return "Success"
    } catch (err) {
        console.log("An error has occurred - leave-group.js - deleteRoomMembership()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function deleteUserGroupNotifications(userID, groupID) {
    const userNotifications = await getNotifications(userID)

    if (userNotifications === "ERROR-OCCURRED")
        return "ERROR-OCCURRED"


    for (let i = 0; i < userNotifications.length; i++) {
        const notification = await getNotification(userNotifications[i].notificationID)

        if (notification === "ERROR-OCCURRED")
            return "ERROR-OCCURRED"


        if (notification.groupID === groupID) {
            let status = null

            status = await deleteTableRow("Users_Notifications", userNotifications[i].id)

            if (status === "ERROR-OCCURRED")
                return "ERROR-OCCURRED"

            status = await deleteTableRow("Notifications", notification.id)

            if (status === "ERROR-OCCURRED")
                return "ERROR-OCCURRED"
        }
    }

    return "Success"
}


async function getNotifications(userID) {
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
        return response.Items
    } catch (err) {
        console.log("An error has occurred - leave-group.js - getNotifications()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function getNotification(notificationID) {
    const params = {
        TableName: "Notifications",
        Key: {
            id: notificationID
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        return response.Item
    } catch (err) {
        console.log("An error has occurred - leave-group.js - getNotification()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function deleteTableRow(tableName, id) {
    const params = {
        TableName: tableName,
        Key: {
            id: id
        }
    }

    try {
        await DynamoDB_client.delete(params).promise()
        return "Success"
    } catch (err) {
        console.log("An error has occurred - leave-group.js - deleteTableRow()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function getGroupMembersNumber(groupID) {
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
        return response.Items.length
    } catch (err) {
        console.log("An error has occurred - leave-group.js - getGroupMembersNumber()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function deleteGroupData(groupID) {
    let status = null

    status = await deleteGroup(groupID)

    if (status === "ERROR-OCCURRED")
        return "ERROR-OCCURRED"


    status = await deleteRooms(groupID)

    if (status === "ERROR-OCCURRED")
        return "ERROR-OCCURRED"


    status = await deleteMessages(groupID)

    if (status === "ERROR-OCCURRED")
        return "ERROR-OCCURRED"


    return "Success"
}


async function deleteGroup(groupID) {
    let status = await deleteTableRow("Groups", groupID)

    if (status === "ERROR-OCCURRED")
        return "ERROR-OCCURRED"

    return "Success"
}


async function deleteRooms(groupID) {
    const roomIDs = await getRoomIDs(groupID)

    if (roomIDs === "ERROR-OCCURRED")
        return "ERROR-OCCURRED"

    for (let i = 0; i < roomIDs.length; i++) {
        let status = null

        status = await deleteTableRow("Rooms", roomIDs[i])

        if (status === "ERROR-OCCURRED")
            return "ERROR-OCCURRED"
    }



    const roomMembershipIDs = await getRoomMembershipIDs(groupID)

    if (roomMembershipIDs === "ERROR-OCCURRED")
        return "ERROR-OCCURRED"

    for (let i = 0; i < roomMembershipIDs.length; i++) {
        let status = null

        status = await deleteTableRow("Users_Rooms", roomMembershipIDs[i])

        if (status === "ERROR-OCCURRED")
            return "ERROR-OCCURRED"
    }


    return "Success"
}


async function getRoomIDs(groupID) {
    const params = {
        TableName: "Rooms",
        IndexName: "groupID-index",
        KeyConditionExpression: "groupID = :gid",
        ExpressionAttributeValues: {
            ":gid": groupID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()

        let roomIDs = []

        for (let i = 0; i < response.Items.length; i++)
            roomIDs.push(response.Items[i].id)

        return roomIDs
    } catch (err) {
        console.log("An error has occurred - leave-group.js - getRoomIDs()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function getRoomMembershipIDs(groupID) {
    const params = {
        TableName: "Users_Rooms",
        IndexName: "groupID-index",
        KeyConditionExpression: "groupID = :gid",
        ExpressionAttributeValues: {
            ":gid": groupID
        }
    }


    try {
        const response = await DynamoDB_client.query(params).promise()

        let roomMembershipIDs = []

        for (let i = 0; i < response.Items.length; i++)
            roomMembershipIDs.push(response.Items[i].id)

        return roomMembershipIDs
    } catch (err) {
        console.log("An error has occurred - leave-group.js - getRoomMembershipIDs()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function deleteMessages(groupID) {
    const messageIDs = await getMessageIDs(groupID)

    if (messageIDs === "ERROR-OCCURRED")
        return "ERROR-OCCURRED"


    for (let i = 0; i < messageIDs.length; i++) {
        const status = await deleteTableRow("Messages", messageIDs[i])

        if (status === "ERROR-OCCURRED")
            return "ERROR-OCCURRED"
    }


    return "Success"
}


async function getMessageIDs(groupID) {
    const params = {
        TableName: "Messages",
        IndexName: "groupID-index",
        KeyConditionExpression: "groupID = :gid",
        ExpressionAttributeValues: {
            ":gid": groupID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()

        let messageIDs = []

        for (let i = 0; i < response.Items.length; i++)
            messageIDs.push(response.Items[i].id)
        return messageIDs
    } catch (err) {
        console.log("An error has occurred - leave-group.js - getMessageIDs()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function getGroupInfo(groupID) {
    const params = {
        TableName: "Groups",
        Key: {
            id: groupID
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        return response.Item
    } catch (err) {
        console.log("An error has occurred - leave-group.js - getGroupInfo()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function saveGroupInfo(group) {
    const params = {
        TableName: "Groups",
        Item: group
    }

    try {
        await DynamoDB_client.put(params).promise()
        return "Success"
    } catch (err) {
        console.log("An error has occurred - leave-group.js - saveGroupInfo()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
