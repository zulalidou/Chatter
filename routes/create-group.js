const express = require('express')
const router = express.Router()
const jose = require('node-jose')
const bcrypt = require('bcryptjs')
const loginFile = require('./login')
const randomstring = require('randomstring')
const { v4: uuidv4 } = require('uuid')
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


router.post('/', authenticate, async function(req, res) {
    const status = await createGroup(req.body)

    if (status === "Failure") {
        res.status(500).send("Could not create group")
        return
    }

    res.status(200).send(status)
})



// 1. Save the group data in table 'Groups'
// 2. Save the group data in table 'Users_Groups'
// 3. Save the main room data in table 'Rooms'
// 4. Save the main room data in table 'Rooms'
async function createGroup(data) {
    const groupID = uuidv4()
    const roomID = uuidv4()

    const params = {
        TransactItems: [
            {
                Put: {
                    TableName: "Groups",
                    Item: {
                        id: groupID,
                        name: data.name,
                        purpose: data.purpose,
                        date: getDate(),
                        time: getTime(),
                        admin: data.admin,
                        creator: data.admin
                    }
                }
            },
            {
                Put: {
                    TableName: "Users_Groups",
                    Item: {
                        id: uuidv4(),
                        userID: data.admin,
                        groupID: groupID,
                        date: getDate(),
                        time: getTime()
                    }
                }
            },
            {
                Put: {
                    TableName: "Rooms",
                    Item: {
                        id: roomID,
                        groupID: groupID,
                        name: "main",
                        purpose: 'The central location of the group, where all members can meet up to talk about anything.',
                        creator: data.admin, // if this user leaves the group, put "USER NOT FOUND" here instead
                        date: getDate(),
                        time: getTime()
                    }
                }
            },
            {
                Put: {
                    TableName: "Users_Rooms",
                    Item: {
                        id: uuidv4(),
                        userID: data.admin,
                        roomID: roomID,
                        groupID: groupID
                    }
                }
            }
        ]
    }


    try {
        await DynamoDB_client.transactWrite(params).promise()
        return "Success"
    } catch (err) {
        return "Failure"
    }
}


function getDate() {
    let dateObj = new Date()
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    return months[dateObj.getMonth()] + " " + dateObj.getDate() + ", " + dateObj.getFullYear()
}


function getTime() {
    let dateObj = new Date()
    return dateObj.getTime()
}


function isEmpty(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false
    }

    return true
}


module.exports = router
