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
        console.log("An error occurred - get-profile-info.js - authenticate()\n")
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get('/', authenticate, async function(req, res) {
    const profileInfo = await getProfileInfo(req.query.userID)

    if (profileInfo === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }


    const profileInfo_simplified = {
        id: profileInfo.id,
        avatarString: profileInfo.avatarString,
        email: profileInfo.email,
        name: profileInfo.name,
        username: profileInfo.username
    }

    res.status(200).send(profileInfo_simplified)
})


async function getProfileInfo(id) {
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
        console.log("\nAn error occurred - get-profile-info.js - getProfileInfo()\n")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
