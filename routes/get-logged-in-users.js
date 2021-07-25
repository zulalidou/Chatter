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
        console.log("An error occurred - get-logged-in-users.js - authenticate()\n")
        console.log(err.message)
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get('/', authenticate, async function(req, res) {
    console.log('\n\n~~ get-logged-in-users.js CALLED ~~')
    console.log(req.query)
    console.log("===================================================\n\n")

    const loggedInUsers = await getLoggedInUsers(req.query.userID)
    console.log("\n\n[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]")
    console.log("loggedInUsers:")
    console.log(loggedInUsers)
    console.log("[[[[[[[[[[[[[[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]]]]]]]"\n\n)

    if (loggedInUsers === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }


    console.log("9999999999999999999999999999999999999999")
    console.log("loggedInUsers:")
    console.log(loggedInUsers)
    res.status(200).send({response: loggedInUsers})
})



// I think I can actually modify the 'params' variable in such a way that I can add a filter
// to ignore any row in the table that contains the current user's username
async function getLoggedInUsers(userID) {
    const params = {
        TableName: "LoggedInUsers"
    }

    try {
        const response = await DynamoDB_client.scan(params).promise()
        console.log("\n\n\ngetLoggedInUsers()")
        console.log(response)
        console.log("######################################################\n\n")


        let loggedInUsers = []

        for (let i = 0; i < response.Items.length; i++) {
            if (response.Items[i].id === userID)
                continue

            loggedInUsers.push(response.Items[i].username)
        }

        console.log("loggedInUsers:")
        console.log(loggedInUsers)

        return loggedInUsers
    } catch (err) {
        console.log("\n\nAn error occurred - get-logged-in-users.js - getLoggedInUsers()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
