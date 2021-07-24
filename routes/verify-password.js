const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient() // a simplified client for interacting with DynamoDB


function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - verify-password.js - authenticate()\n")
        console.log(err.message)
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get('/', authenticate, async function(req, res) {
    console.log('\n\nverify-pasword-route')
    console.log(req.query)
    console.log('------------------------------\n')

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

        console.log("\ngetUserInfo() called")
        console.log(response)
        console.log("==================================================\n\n")
        return response.Item
    } catch (err) {
        console.log("An error occurred - verify-password.js - getUserInfo()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function isPasswordCorrect(passwordEntered, passwordStored) {
    console.log("\nisPasswordCorrect() called")
    if (await bcrypt.compare(passwordEntered, passwordStored)) {
        console.log("TRRUUEE")
        return true
    }

    console.log("FALLSSE")
    return false
}


module.exports = router
