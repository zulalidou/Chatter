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
        console.log("An error occurred - is-user-group-member.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get("/", authenticate, async function(req, res) {
    console.log("\n\n\nis-user-group-member.js route")
    console.log(req.query)

    const result = await userIsGroupMember(req.query.userID, req.query.groupID)

    if (result === "Failure") {
        res.status(500).send("Couldn't retrieve information.")
        return
    }

    res.status(200).send(result)
})


async function userIsGroupMember(userID, groupID) {
    console.log("\n\nuserIsGroupMember()")

    const params = {
        TableName: "Users_Groups",
        IndexName: "userID-index",
        KeyConditionExpression: "userID = :uid",
        ExpressionAttributeValues: {
            ":uid": userID
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        console.log(response)
        console.log("=================================================\n\n")

        for (let i = 0; i < response.Items.length; i++) {
            if (response.Items[i].groupID === groupID)
                return true
        }

        return false
    } catch (err) {
        console.log("An error has occurred - is-user-group-member.js - userIsGroupMember()")
        return "Failure"
    }
}


module.exports = router
