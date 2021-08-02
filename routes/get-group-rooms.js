const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"}) // is this always necessary?
const DynamoDB_client = new AWS.DynamoDB.DocumentClient() // a simplified client for interacting with DynamoDB



function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - get-group-rooms.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get('/', authenticate, async function(req, res) {
    const rooms = await getRooms(req.query.groupID)

    if (rooms === "ERROR-OCCURRED") {
        res.status(500).send("Couldn't retrieve data.")
        return
    }

    rooms.sort((a, b) => (a.time < b.time) ? -1 : 1)
    res.status(200).send(rooms)
})


async function getRooms(groupID) {
    const params = {
        TableName: 'Rooms',
        IndexName: 'groupID-index',
        KeyConditionExpression: 'groupID = :gid',
        ExpressionAttributeValues: {
            ':gid': groupID
        }
    }

    try {
        const rooms = await DynamoDB_client.query(params).promise()
        return rooms.Items
    } catch (err) {
        console.log("An error occurred - get-group-rooms.js - getRooms()\n")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
