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
        console.log("An error occurred - delete-notification.js - authenticate()\n")
        console.log(err.message)
        res.status(401).send(err.message)
        return
    }

    next()
}


router.get('/', authenticate, async function(req, res) {
    // 1. Remove notification from user's info
    // 2. Remove notification from Notifications table in DB

    console.log('\n\ndelete-notification route called')
    console.log(req.query)

    const notificationID = await getNotificationID(req.query.userID, req.query.groupID)

    if (notificationID === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }


    const notificationMembershipID = await getNotificationMembershipID(notificationID)

    if (notificationMembershipID === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }


    const status = await deleteNotifications(notificationID, notificationMembershipID)

    if (status === "ERROR-OCCURRED") {
        res.status(404).send("The requested resource was not found.")
        return
    }


    res.status(200).send()
})


async function getNotificationID(userID, groupID) {
    console.log("\ngetNotificationID()")

    const params = {
        TableName: "Notifications",
        IndexName: "recipient-index",
        KeyConditionExpression: "recipient = :r",
        ExpressionAttributeValues: {
            ":r": userID
        }
    }

    try {
        let response = await DynamoDB_client.query(params).promise()

        let notificationID = null
        console.log("\nresponse:")
        console.log(response)
        console.log("=====================>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>\n\n")

        for (let i = 0; i < response.Items.length; i++) {
            if (response.Items[i].type === "group-invitation" && response.Items[i].groupID === groupID)
                notificationID = response.Items[i].id
        }

        return notificationID
    } catch (err) {
        console.log("An error occurred - delete-notification.js - getNotificationID()\n")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function getNotificationMembershipID(notificationID) {
    console.log("getNotificationMembershipID()")

    const params = {
        TableName: "Users_Notifications",
        IndexName: "notificationID-index",
        KeyConditionExpression: "notificationID = :nid",
        ExpressionAttributeValues: {
            ":nid": notificationID
        }
    }

    try {
        let response = await DynamoDB_client.query(params).promise()
        let notificationID = null
        return response.Items[0].id
    } catch (err) {
        console.log("An error occurred - delete-notification.js - getNotificationMembershipID()\n")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function deleteNotifications(notificationID, notificationMembershipID) {
    console.log("\n\ndeleteNotifications() called")
    console.log(notificationID)
    console.log(notificationMembershipID)

    const params = {
        TransactItems: [
            {
                Delete: {
                    TableName : "Notifications",
                    Key: {
                        id: notificationID
                    }
                }
            },
            {
                Delete: {
                    TableName : "Users_Notifications",
                    Key: {
                        id: notificationMembershipID
                    }
                }
            }
        ]
    }

    try {
        await DynamoDB_client.transactWrite(params).promise()
        return "Success"
    } catch (err) {
        console.log("\nAn error occurred - delete-notification.js - deleteNotifications()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


module.exports = router
