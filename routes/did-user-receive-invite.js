const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()



function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - did-user-receive-invite.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get("/", authenticate, async function(req, res) {
    const notifications = await getNotifications(req.query.userID)

    if (notifications === "ERROR-OCCURRED") {
        res.status(404).send("ERROR-OCCURRED")
        return
    }

    for (let i = 0; i < notifications.length; i++) {
        if (notifications[i].groupID === req.query.groupID && notifications[i].type === "group-invitation") {
            res.status(200).send(true)
            return
        }
    }

    res.status(200).send(false)
})


async function getNotifications(userID) {
    const params = {
        TableName: "Notifications",
        IndexName: "recipient-index",
        KeyConditionExpression: "recipient = :uid",
        ExpressionAttributeValues: {
            ":uid": userID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        return response.Items
    } catch (err) {
        console.log("An error has occurred - did-user-receive-invite.js - getNotifications()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
