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
        res.status(401).send(err.message)
        return
    }

    next()
}


router.post("/", authenticate, async function(req, res) {
    const status = await setNewGroupAdmin(req.body.groupID, req.body.userID)

    if (status === "ERROR-OCCURRED") {
        res.status(500).send("Couldn't set new admin")
        return
    }

    res.status(200).send(status)
})


// Sets the new group admin to the userID passed, only if the current group admin is set to null
async function setNewGroupAdmin(groupID, userID) {
    var params = {
        TableName: "Groups",
        Key: {
            id: groupID
        },
        UpdateExpression: "set #a = :uid",
        ConditionExpression: "#a = :n",
        ExpressionAttributeNames: {
            "#a" : "admin"
        },
        ExpressionAttributeValues: {
            ":uid" : userID,
            ":n": null
        }
    }

    try {
        await DynamoDB_client.update(params).promise()
        return "SUCCESS"
    } catch (err) {
        return "ERROR-OCCURRED"
    }
}


module.exports = router
