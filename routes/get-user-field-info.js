const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"}) // is this always necessary?
const DynamoDB_client = new AWS.DynamoDB.DocumentClient() // a simplified client for interacting with DynamoDB



function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - get-user-field-info.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get('/', authenticate, async function(req, res) {
    console.log('\n\n|| ~~~ get-user-field-info.js ~~~ ||')
    console.log(req.query)
    console.log('\n')

    const userInfo = await getUserInfo(req.query.userID)

    if (userInfo === "ERROR-OCCURRED") {
        res.status(404).send("Couldn't get user info.")
        return
    }

    console.log(userInfo[req.query.attribute])
    console.log("\n\n")
    res.status(200).send(userInfo[req.query.attribute])
})


async function getUserInfo(id) {
    const params = {
        TableName: 'Users',
        Key: {
            id: id
        }
    }

    try {
        const user = await DynamoDB_client.get(params).promise()
        return user.Item
    } catch (err) {
        console.log("An error occurred - get-user-field-info.js - getUserInfo()\n")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
