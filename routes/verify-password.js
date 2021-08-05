const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient() // a simplified client for interacting with DynamoDB


async function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)


        // Now check to see if the jwt token is stored in the BlacklistedJWTs table
        // - If it is, then deny the request
        // - Otherwise, allow the request
        const tokenIsBlacklisted = await tokenBlacklisted(req.cookies.jwtHP + "." + req.cookies.jwtS)

        if (tokenIsBlacklisted === "ERROR-OCCURRED") {
            res.status(401).send("An error occurred")
            return
        }

        if (tokenIsBlacklisted) {
            res.status(401).send("The token was blacklisted")
            return
        }
    } catch (err) {
        console.log("An error occurred - verify-password.js - authenticate()\n")
        console.log(err.message)
        res.status(401).send(err.message)
        return
    }

    next()
}


async function tokenBlacklisted(jwt) {
    const params = {
        TableName: "BlacklistedJWTs",
        Key: {
            jwt: jwt
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        const jwt = response.Item

        if (isEmpty(jwt))
            return false
        return true
    } catch (err) {
        return "ERROR-OCCURRED"
    }
}


router.get('/', authenticate, async function(req, res) {
    const userInfo = await getUserInfo(req.query.userID)

    if (userInfo === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }


    if (await isPasswordCorrect(req.query.password, userInfo.password))
        res.status(200).send("Success")
    else
        res.status(500).send("Failure")
})


async function getUserInfo(userID) {
    const params = {
        TableName: 'Users',
        Key: {
            id: userID
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        return response.Item
    } catch (err) {
        console.log("An error occurred - verify-password.js - getUserInfo()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function isPasswordCorrect(passwordEntered, passwordStored) {
    if (await bcrypt.compare(passwordEntered, passwordStored))
        return true

    return false
}


function isEmpty(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false
    }

    return true
}


module.exports = router
