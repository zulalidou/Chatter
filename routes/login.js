const express = require('express')
const router = express.Router()
const passport = require('passport')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const randomstring = require('randomstring')
const jose = require('node-jose')
const jwt_decode = require('jwt-decode')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient() // a simplified client for interacting with DynamoDB



router.post('/', async function(req, res) {
    // console.log('\n\nlogin.js')
    // console.log(req.body)
    // console.log('----------------------------\n\n')

    const userInfo = await getUserInfo(req.body.email)

    // User does not exist
    if (userInfo === null || userInfo === undefined) {
        res.status(401).send("Login failed")
        return
    }


    // console.log("userInfo:")
    // console.log(userInfo)
    // console.log('----------------------------\n\n')


    // Password is incorrect
    if (!(await isPasswordCorrect(req.body.password, userInfo.password))) {
        res.status(401).send("Login failed")
        return
    }


    const session = getSession(userInfo)


    console.log("\n\nsession:")
    console.log('----------------------------')
    console.log(session)
    console.log('----------------------------\n\n')


    // expires in 1 hour & 1 min
    // - the additional minute is just to make sure that there's enough time for the /logout route to be called and do some cleanup
    //   before the token itself expires
    const jwtToken = jwt.sign(session, process.env.jwtSignKey, {expiresIn: (60 * 60) + 60})
    const JwtTokenArray = jwtToken.split(".")
    const header = JwtTokenArray[0]
    const payload = JwtTokenArray[1]
    const signature = JwtTokenArray[2]

    console.log("header = " + header)
    console.log("payload = " + payload)
    console.log("signature = " + signature)


    console.log("\n\nBefore try-1")

    try {
        console.log("Within try-1")
        res.cookie("jwtHP", header + "." + payload, {sameSite: "none", secure: true, httpOnly: false, maxAge: 900000}) // domain?
        console.log("COOKIE-1 SUCCESSFULLY SET")
    } catch (e) {
        console.log("TRY-1-ERROR-CALLED:")
        console.log(e)
        console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++")
    }

    console.log("After try-1\n\n")


    console.log("Before try-22")

    try {
        console.log("Within try-22")
        res.cookie("jwtS", signature, {sameSite: "none", secure: true, httpOnly: true, maxAge: 900000}) // domain?
        console.log("COOKIE-22 SUCCESSFULLY SET")
    } catch (e) {
        console.log("TRY-22-ERROR-CALLED:")
        console.log(e)
        console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++")
    }

    console.log("After try-22\n\n")




    setUserToActive(session.userID, session.username, header + "." + payload + "." + signature, session.expirationTime)

    console.log("~THE-END~\n")
    console.log("LOGIN-WAS-SUCCESSFUL\n\n")

    // console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>")
    // console.log("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n")

    res.status(200).send("Login successful")
})


async function getUserInfo(email) {
    const params = {
        TableName: 'Users',
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email
        }
    }

    try {
        const response = await DynamoDB_client.query(params).promise()
        return response.Items[0]
    } catch (err) {
        console.log('\n\nAn error occurred - login.js - getUserInfo()')
        console.log(err)
        return null
    }
}


async function isPasswordCorrect(passwordEntered, passwordStored) {
    // console.log("\n\npasswordEntered = " + passwordEntered)
    // console.log("passwordStored = " + passwordStored + "\n\n")

    if (await bcrypt.compare(passwordEntered, passwordStored))
        return true
    return false
}


function getSession(userInfo) {
    const session = {
        userID: userInfo.id,
        username: userInfo.username,

        // Needed for 2 reasons:
        // 1: To make each JWT/session unique, that way if a JWT needs to be invalidated, we store it in a table, and if someone tries
        //    to log in with that same JWT, it won't work
        // 2: To set the TTL for the JWT when we blacklist it in a table. (The time needs to be in seconds)
        expirationTime: Math.ceil(Date.now()/1000) + (60 * 60) + 60  // 1 hour + 1 min from now
    }

    return session
}


async function setUserToActive(userID, username, jwt, expirationTime) {
    const params = {
        TableName: "LoggedInUsers",
        Item: {
            id: userID,
            username: username,
            jwt: jwt,
            timeToLive: expirationTime
        }
    }


    console.log("setUserToActive() called")

    try {
        await DynamoDB_client.put(params).promise()
        console.log("setUserToActive() -- SUCCESS")
    } catch (err) {
        console.log("An error occurred - login.js - setUserToActive()")
        console.log(err)
        console.log("setUserToActive() -- FAILURE")
    }
}


module.exports = router
