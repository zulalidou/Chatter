const express = require('express')
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
        console.log("An error occurred - get-group-members.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get('/', authenticate, async function(req, res) {
    const groupMemberships = await getGroupMemberships(req.query.groupID)

    if (groupMemberships === "ERROR-OCCURED") {
        res.status(500).send("Couldn't retrieve data.")
        return
    }

    let groupMembers = {}

    for (let i = 0; i < groupMemberships.length; i++) {
        const username = await getUsername(groupMemberships[i].userID)

        if (username === "ERROR-OCCURED") {
            res.status(500).send("Couldn't retrieve data.")
            return
        }

        groupMembers[groupMemberships[i].userID] = username
    }

    res.status(200).send(groupMembers)
})


async function getGroupMemberships(groupID) {
    const params = {
        TableName: "Users_Groups",
        IndexName: "groupID-index",
        KeyConditionExpression: "groupID = :gid",
        ExpressionAttributeValues: {
            ":gid": groupID
        }
    }

    try {
        const user = await DynamoDB_client.query(params).promise()
        return user.Items
    } catch (err) {
        console.log("An error occurred - get-group-members.js - getGroupMemberships()\n")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function getUsername(id) {
    const params = {
        TableName: 'Users',
        Key: {
            id: id
        }
    }

    try {
        const user = await DynamoDB_client.get(params).promise()
        return user.Item.username
    } catch (err) {
        console.log("An error occurred - get-group-members.js - getUsername()\n")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
