const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()


function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - get-groups.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get('/', authenticate, async function(req, res) {
    const groupMemberships = await getGroupMemberships(req.query.userID)

    if (groupMemberships === "ERROR-OCCURRED") {
        res.status(404).send("Couldn't retrieve data")
        return
    }

    let groups = []

    for (let i = 0; i < groupMemberships.length; i++) {
        const groupInfo = await getGroupInfo(groupMemberships[i].groupID)

        if (groupInfo === "ERROR-OCCURRED") {
            res.status(404).send("Couldn't retrieve data")
            return
        }

        groups.push(groupInfo)
    }

    res.status(200).send(groups)
})


async function getGroupMemberships(userID) {
    const params = {
        TableName: 'Users_Groups',
        IndexName: 'userID-index',
        KeyConditionExpression: 'userID = :uid',
        ExpressionAttributeValues: {
            ':uid': userID
        }
    }

    try {
        const groups = await DynamoDB_client.query(params).promise()
        return groups.Items
    } catch (err) {
        console.log('\n')
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function getGroupInfo(id) {
    const params = {
        TableName: 'Groups',
        Key: {
            id: id
        }
    }

    try {
        const groups = await DynamoDB_client.get(params).promise()
        return groups.Item
    } catch (err) {
        console.log('\n')
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
