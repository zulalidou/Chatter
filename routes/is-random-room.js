const express = require("express")
const router = express.Router()
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient() // a simplified client for interacting with DynamoDB



function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - is-random-room.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get("/", authenticate, async function(req, res) {
    console.log("\n\nis-random-room route called\n")
    console.log(req.query)
    console.log("+++++++++++++++++++++++++++++++++++++++\n")

    const result = await isRandomRoom(req.query.roomID)

    if (result === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }
    res.status(200).send(result)
})


async function isRandomRoom(roomID) {
    const params = {
        TableName: "Rooms",
        Key: {
            id: roomID
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()

        console.log("\nisRandomRoom() called")
        console.log(response)
        console.log("\n()((((((((((((((((((((()))))))))))))))))))))")

        if (isEmpty(response))
            return false

        if (response.Item.groupID === "null")
            return true
        return false
    } catch (err) {
        console.log("An error has occurred - is-random-room.js - isRandomRoom()")
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
