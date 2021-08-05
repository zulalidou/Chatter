const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()



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
        console.log("An error occurred - get-logged-in-users.js - authenticate()\n")
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
    const loggedInUsers = await getLoggedInUsers(req.query.userID)

    if (loggedInUsers === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }

    res.status(200).send(loggedInUsers)
})



// I think I can actually modify the 'params' variable in such a way that I can add a filter
// to ignore any row in the table that contains the current user's username
async function getLoggedInUsers(userID) {
    const params = {
        TableName: "LoggedInUsers"
    }

    try {
        const response = await DynamoDB_client.scan(params).promise()

        let loggedInUsers = []

        for (let i = 0; i < response.Items.length; i++) {
            if (response.Items[i].id === userID)
                continue

            loggedInUsers.push(response.Items[i].username)
        }

        return loggedInUsers
    } catch (err) {
        console.log("\n\nAn error occurred - get-logged-in-users.js - getLoggedInUsers()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


function isEmpty(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false
    }

    return true
}


module.exports = router
