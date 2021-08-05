const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
var CryptoJS = require("crypto-js")

const AWS = require('aws-sdk')
AWS.config.update({
    region: "us-west-2",
    endpoint: "https://dynamodb.us-west-2.amazonaws.com"
})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()



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
        console.log("An error occurred - get-room-messages.js - authenticate()\n")
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


router.get("/", authenticate, async function(req, res) {
    const messagesInfo = await getMessages(req.query.roomID)

    if (messagesInfo === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }


    messagesInfo.sort((a, b) => a.time - b.time)

    let messagesList = []

    for (let i = 0; i < messagesInfo.length; i++) {
        const avatarString = await getAvatarString(messagesInfo[i].senderID)

        if (avatarString === "ERROR-OCCURRED") {
            res.status(404).send("Couldn't retrieve data")
            return
        }

        messagesList.push({
            senderID: messagesInfo[i].senderID,
            username: messagesInfo[i].username,
            avatarString: avatarString,
            message: decryptMessage(messagesInfo[i].message),
            date: messagesInfo[i].date,
            time: messagesInfo[i].time
        })
    }

    res.status(200).send(messagesList)
})


function decryptMessage(ciphertext) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.messagesKey)
    const originalText = bytes.toString(CryptoJS.enc.Utf8)
    return originalText
}


async function getMessages(roomID) {
    const params = {
        TableName: "Messages",
        IndexName: "roomID-index",
        KeyConditionExpression: "roomID = :rid",
        ExpressionAttributeValues: {
            ":rid": roomID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        return response.Items
    } catch (err) {
        console.log("An error occurred - get-room-messages.js - getMessages()\n")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function getAvatarString(userID) {
    const params = {
        TableName: "Users",
        Key: {
            id: userID
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()

        if (isEmpty(response))
            return "404"
        return response.Item.avatarString
    } catch (err) {
        console.log("An error has occurred - get-room-messages.js - getAvatarString()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}



function isEmpty(userObject) {
    for (const prop in userObject) {
        if (userObject.hasOwnProperty(prop))
            return false
    }

    return true
}


module.exports = router
