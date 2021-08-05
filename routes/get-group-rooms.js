const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"}) // is this always necessary?
const DynamoDB_client = new AWS.DynamoDB.DocumentClient() // a simplified client for interacting with DynamoDB



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
        console.log("An error occurred - get-group-rooms.js - authenticate()\n")
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


function isEmpty(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false
    }

    return true
}


module.exports = router
