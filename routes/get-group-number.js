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
        console.log("An error occurred - get-group-number.js - authenticate()\n")
        console.log(err.message)
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get('/', authenticate, async function(req, res) {
    console.log('\n\nget-group-number.js called')

    const groupNumber = await getGroupNumber(req.query.userID)

    if (groupNumber === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found")
        return
    }

    res.status(200).send(groupNumber.toString())
})


async function getGroupNumber(userID) {
    const params = {
        TableName: "Users_Groups",
        IndexName: "userID-index",
        KeyConditionExpression: "userID = :uid",
        ExpressionAttributeValues: {
            ":uid": userID
        }
    }

    try {
        const groups = await DynamoDB_client.query(params).promise()
        return groups.Items.length
    } catch (err) {
        console.log("\nAn error occurred - get-group-number.js - getGroupNumber()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
