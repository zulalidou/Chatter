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
        console.log("An error occurred - get-user-id.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get("/", authenticate, async function(req, res) {
    const userID = await getUserID(req.query.username)

    if (userID === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }

    res.status(200).send(userID)
})


async function getUserID(username) {
    const params = {
        TableName: "Users",
        IndexName: "username-index",
        KeyConditionExpression: "username = :u",
        ExpressionAttributeValues: {
            ":u": username
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()

        if (response.Count === 0)
            return ""
        return response.Items[0].id
    } catch (err) {
        console.log("An error occurred - get-user-id.js - getUserID()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
