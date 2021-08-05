const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
var CryptoJS = require("crypto-js")

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
        console.log("An error occurred - save-message-to-db.js - authenticate()\n")
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
    req.body.message = encryptMessage(req.body.message)

    const status = await storeMessage(req.body)

    if (status === "ERROR-OCCURRED") {
        res.status(500).send("Couldn't store messages")
        return
    }

    res.status(200).send("Success")
})


function encryptMessage(message) {
    const ciphertext = CryptoJS.AES.encrypt(message, process.env.messagesKey).toString()
    return ciphertext
}


async function storeMessage(data) {
    const params = {
        TableName: "Messages",
        Item: data
    }

    try {
        await DynamoDB_client.put(params).promise()
        return "Success"
    } catch (err) {
        console.log('An error occurred - save-message-to-db.js - storeMessage')
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
