const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient() // a simplified client for interacting with DynamoDB



function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - send-notification.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.post('/', authenticate, async function(req, res) {
    console.log("\n\nsend-notification.js has been called\n")


    const status = await saveNotification(req.body)
    console.log("\nstatus = " + status + "\n\n")

    if (status === "ERROR-OCCURRED") {
        res.status(500).send("Operation failed")
        return
    }

    res.status(200).end("Success")
})


async function saveNotification(notification) {
    console.log("\nsaveNotification -- before\n")

    console.log("params-params-params:")
    console.log(notification)
    console.log("==========================================================================>>>>>>>>>>>>>>>>>>>>>>>>>\n")

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
                        notificationID: notification.id
                    }
                }
            }
        ]
    }

    console.log("\nsaveNotification -- after\n")


    try {
        await DynamoDB_client.transactWrite(params).promise()
        return "SUCCESS"
    } catch (err) {
        console.log("\nAn error occurred - send-notification.js - saveNotification()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
