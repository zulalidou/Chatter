const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
var CryptoJS = require("crypto-js")

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient() // a simplified client for interacting with DynamoDB



function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - save-message-to-db.js - authenticate()\n")
        console.log(err.message)
        res.status(401).send(err.message)
        return
    }

    next()
}


router.post('/', authenticate, async function(req, res) {
    console.log('\n\n\nsave-message-to-db.js')
    console.log("---------------------------------------------")
    console.log(req.body)
    console.log("---------------------------------------------\n\n\n")


    req.body.message = encryptMessage(req.body.message)

    const status = await storeMessage(req.body)

    if (status === "ERROR-OCCURRED") {
        console.log("send-message-to-db.js - something went wrong\n\n")
        res.status(500).send("Couldn't store messages")
        return
    }

    console.log("send-message-to-db.js - everything went completely well\n\n")
    res.status(200).send("Success")
})


function encryptMessage(message) {
    console.log("encryptMessage() - begin")

    const ciphertext = CryptoJS.AES.encrypt(message, process.env.messagesKey).toString()
    return ciphertext

    console.log("encryptMessage() - end\n\n")
}


async function storeMessage(data) {
    const params = {
        TableName: "Messages",
        Item: data
    }


    console.log("storeMessage() - called")
    try {
        await DynamoDB_client.put(params).promise()
        console.log("Message successfully stored!")
        return "Success"
    } catch (err) {
        console.log('An error occurred - save-message-to-db.js - storeMessage')
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
