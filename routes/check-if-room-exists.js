const express = require("express")
const router = express.Router()
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()



function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - check-if-room-exists.js - authenticate()\n")
        console.log(err.message)
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get("/", authenticate, async function(req, res) {
    console.log("\n\n\ncheck-if-room-exists.js")
    console.log(req.query)
    console.log("\n")

    const result = await roomExists(req.query.roomID)

    if (result === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }

    res.status(200).send(result)
})


async function roomExists(roomID) {
    const params = {
        TableName: "Rooms",
        Key: {
            id: roomID
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        console.log(response)

        if (isEmpty(response.Item))
            return false
        return true
    } catch (err) {
        console.log("An error has occurred - check-if-room-exists.js - roomExists()")
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
