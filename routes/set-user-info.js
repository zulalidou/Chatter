const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()


// ------------------------------------
// For accessing the SendInBlue API
const SibApiV3Sdk = require('sib-api-v3-sdk')
const defaultClient = SibApiV3Sdk.ApiClient.instance


// Configure API key authorization: api-key
const apiKey = defaultClient.authentications['api-key']
apiKey.apiKey = process.env.Sib_API_Key



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
        console.log("An error occurred - set-user-info.js - authenticate()\n")
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
    const userInfo = await getUserInfo(req.body.userID)

    if (userInfo === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }


    if (req.body.attribute === 'password')
        userInfo[req.body.attribute] = await bcrypt.hash(req.body.value, 10) // bcrypt automatically saves the salt inside the password
    else
        userInfo[req.body.attribute] = req.body.value


    const dataUpdated = await updateUserInfo(userInfo)

    if (dataUpdated === "ERROR-OCCURRED") {
        res.status(500).send("Couldn't update user info")
        return
    }


    if (req.body.attribute === "name" || req.body.attribute === "password")
        sendEmailNotification(userInfo.email, userInfo.name.split(" ")[0], req.body.attribute)

    res.status(200).send("Success")
})


async function getUserInfo(id) {
    const params = {
        TableName: 'Users',
        Key: {
            id : id
        }
    }

    try {
        const response = await DynamoDB_client.get(params).promise()
        return response.Item
    } catch (err) {
        console.log("An error occurred - set-user-info.js - getUserInfo()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function updateUserInfo(userInfo) {
    const params = {
        TableName: 'Users',
        Item: userInfo
    }

    try {
        await DynamoDB_client.put(params).promise()
        return true
    } catch (err) {
        console.log("An error occurred - set-user-info.js - saveUserInfo()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


function sendEmailNotification(email, firstName, attribute) {
    const api = new SibApiV3Sdk.TransactionalEmailsApi()
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()

    sendSmtpEmail = {
        to: [{
            email: email
        }],
        templateId: 5,
        params: {
            firstName: firstName,
            attribute: attribute
        },
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }

    api.sendTransacEmail(sendSmtpEmail).then(
      function(data) {}
    , function(error) {
        console.log("\n\nAn error has occurred - set-user-info.js - sendEmailNotification()")
        console.error(error.message)
    })
}


function isEmpty(obj) {
    for (let prop in obj) {
        if (obj.hasOwnProperty(prop))
            return false
    }

    return true
}


module.exports = router
