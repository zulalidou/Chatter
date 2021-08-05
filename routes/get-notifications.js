const express = require('express')
const router = express.Router()
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
        console.log("An error occurred - get-notifications.js - authenticate()\n")
        res.status(200).send([])
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
    const notifications = await getNotifications(req.query.userID)

    if (notifications === "ERROR-OCCURRED") {
        res.status(404).send("Couldn't retrieve data")
        return
    }


    let userNotifications = []

    for (let i = 0; i < notifications.length; i++) {
        const notification = await getNotification(notifications[i].notificationID)

        if (notification === "ERROR-OCCURRED") {
            res.status(404).send("Couldn't retrieve data")
            return
        }

        userNotifications.push(notification)
    }

    res.status(200).send(userNotifications)
})


async function getNotifications(userID) {
    const params = {
        TableName: "Users_Notifications",
        IndexName: "userID-index",
        KeyConditionExpression: "userID = :uid",
        ExpressionAttributeValues: {
            ':uid': userID
        }
    }

    try {
        const groups = await DynamoDB_client.query(params).promise()
        return groups.Items
    } catch (err) {
        console.log("\nAn error occurred - get-qualifications.js - getNotifications()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function getNotification(id) {
    const params = {
        TableName: "Notifications",
        Key: {
            id: id
        }
    }

    try {
        const user = await DynamoDB_client.get(params).promise()
        return user.Item
    } catch (err) {
        console.log("\nAn error occurred - get-qualifications.js - getNotification()")
        console.log(err)
        return "ERROR-COMPONENT"
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
