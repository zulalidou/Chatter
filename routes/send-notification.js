const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
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
        console.log("An error occurred - send-notification.js - authenticate()\n")
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
    const status = await saveNotification(req.body)

    if (status === "ERROR-OCCURRED") {
        res.status(500).send("Operation failed")
        return
    }

    res.status(200).end("Success")
})


async function saveNotification(notification) {
    const params = {
        TransactItems: [
            {
                Put: {
                    TableName: "Notifications",
                    Item: notification
                }
            },
            {
                Put: {
                    TableName: "Users_Notifications",
                    Item: {
                        id: uuidv4(),
                        userID: notification.recipient,
                        notificationID: notification.id,
                        timeToLive: notification.timeToLive
                    }
                }
            }
        ]
    }

    try {
        await DynamoDB_client.transactWrite(params).promise()
        return "SUCCESS"
    } catch (err) {
        console.log("\nAn error occurred - send-notification.js - saveNotification()")
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
