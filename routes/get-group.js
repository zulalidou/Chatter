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
        console.log("An error occurred - get-group.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get("/", authenticate, async function(req, res) {
    const group = await getGroupInfo(req.query.groupID)

    if (group === "ERROR-OCCURRED") {
        res.status(500).send("Couldn't retrieve data.")
        return
    }

    res.status(200).send(group)
})


async function getGroupInfo(groupID) {
    const params = {
        TableName: "Groups",
        Key: {
            id: groupID
        }
    }

    try {
        const user = await DynamoDB_client.get(params).promise()
        return user.Item
    } catch (err) {
        console.log('\n')
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
