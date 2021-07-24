const express = require("express")
const router = express.Router()
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({
    region: "us-west-2",
    endpoint: "https://dynamodb.us-west-2.amazonaws.com"
})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()



function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - get-user2-data.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get("/", authenticate, async function(req, res) {
    console.log("\n\n\nget-user2-data route")
    console.log("req.query:")
    console.log(req.query)
    console.log("===================================================\n\n")


    const user2ID = await getUser2ID(req.query.roomID, req.query.user1ID)

    if (user2ID === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }


    const user2username = await getUsername(user2ID)

    if (user2username === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }

    res.status(200).send({id: user2ID, username: user2username})
})


async function getUser2ID(roomID, user1ID) {
    const params = {
        TableName: "Users_Rooms",
        IndexName: "roomID-index",
        KeyConditionExpression: "roomID = :rid",
        ExpressionAttributeValues: {
            ":rid": roomID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()

        console.log("\n\n\ngetUser2ID() called")
        console.log("===================================================")
        console.log(response)
        console.log("===================================================\n")

        if (response.Items[0].userID === user1ID)
            return response.Items[1].userID
        return response.Items[0].userID
    } catch (err) {
        console.log("An error has occurred - get-user2-data.js - getUser2ID()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function getUsername(userID) {
    const params = {
        TableName: "Users",
        Key: {
            id: userID
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        return response.Item.username
    } catch (err) {
        console.log("An error has occurred - get-user2-data.js - getUsername()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
