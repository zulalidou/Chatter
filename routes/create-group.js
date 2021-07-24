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



function authenticate(req, res, next) {
    try {
        jwt.verify(req.cookies.jwtHP + "." + req.cookies.jwtS, process.env.jwtSignKey)
    } catch (err) {
        console.log("An error occurred - create-groups.js - authenticate()\n")
        console.log(err.message)
        res.status(401).send(err.message)
        return
    }

    next()
}


router.post('/', authenticate, async function(req, res) {
    console.log('\n\ncreate-group called')
    console.log(req.body)
    console.log('++++++++++++++++++++++++++++\n')


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
        console.log("\nAn error occurred - create-group.js - createGroup()")
        console.log(err)
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


module.exports = router
