const express = require("express")
const router = express.Router()
const jwt = require('jsonwebtoken')

const AWS = require('aws-sdk')
AWS.config.update({
    region: "us-west-2",
    endpoint: "https://dynamodb.us-west-2.amazonaws.com"
})
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


router.post("/", authenticate, async function(req, res) {
    const status = await setNewGroupAdmin(req.body.groupID, req.body.userID)

    if (status === "ERROR-OCCURRED") {
        res.status(500).send("Couldn't set new admin")
        return
    }

    res.status(200).send(status)
})


// Sets the new group admin to the userID passed, only if the current group admin is set to null
async function setNewGroupAdmin(groupID, userID) {
    var params = {
        TableName: "Groups",
        Key: {
            id: groupID
        },
        UpdateExpression: "set #a = :uid",
        ConditionExpression: "#a = :n",
        ExpressionAttributeNames: {
            "#a" : "admin"
        },
        ExpressionAttributeValues: {
            ":uid" : userID,
            ":n": null
        }
    }

    try {
        await DynamoDB_client.update(params).promise()
        return "SUCCESS"
    } catch (err) {
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
