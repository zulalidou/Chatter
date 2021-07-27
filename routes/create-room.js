const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const jose = require('node-jose')
const bcrypt = require('bcryptjs')
const loginFile = require('./login')
const randomstring = require('randomstring')
const { v4: uuidv4 } = require('uuid')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()



function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        res.status(401).send(err.message)
        return
    }

    next()
}


router.post('/', authenticate, async function(req, res) {
    const result = await createRoom(req.body)

    if (result === "ERROR-OCCURRED") {
        res.status(500).send("Couldn't create room")
        return
    }


    if (req.body.groupRoom) {
        const groupMemberIDs = await getGroupMemberIDs(req.body.groupID)

        if (result === "ERROR-OCCURRED") {
            res.status(404).send("Couldn't retrieve group member ids")
            return
        }


        for (let i = 0; i < groupMemberIDs.length; i++) {
            const status = await createRoomMembership(groupMemberIDs[i], req.body.id, req.body.groupID)

            if (status === "ERROR-OCCURRED") {
                res.status(500).send("Couldn't create room membership")
                return
            }
        }
    }
    else {
        let status = await createRoomMembership(req.body.user1ID, req.body.id, "null")

        if (status === "ERROR-OCCURRED") {
            res.status(500).send("Couldn't create room membership")
            return
        }

        status = await createRoomMembership(req.body.user2ID, req.body.id, "null")

        if (status === "ERROR-OCCURRED") {
            res.status(500).send("Couldn't create room membership")
            return
        }
    }


    res.status(200).send("Success")
})


async function createRoom(room) {
    const params = {
        TableName: "Rooms",
        Item: {
            id: room.id,
            groupID: room.groupID,
            name: room.name,
            purpose: room.purpose,
            creator: room.creator,
            date: room.date,
            time: room.time
        }
    }

    try {
        await DynamoDB_client.put(params).promise()
        return "Success"
    } catch (err) {
        return "ERROR-OCCURRED"
    }
}


async function getGroupMemberIDs(groupID) {
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

        let groupMemberIDs = []

        for (let i = 0; i < response.Items.length; i++)
            groupMemberIDs.push(response.Items[i].userID)

        return groupMemberIDs
    } catch (err) {
        return "ERROR-OCCURRED"
    }
}


async function createRoomMembership(userID, roomID, groupID) {
    const params = {
        TableName: "Users_Rooms",
        Item: {
            id: uuidv4(),
            userID: userID,
            roomID: roomID,
            groupID: groupID,
        }
    }

    try {
        await DynamoDB_client.put(params).promise()
        return "Success"
    } catch (err) {
        return "ERROR-OCCURRED"
    }
}


module.exports = router
