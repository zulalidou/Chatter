const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')

const AWS = require('aws-sdk')
AWS.config.update({
    region: "us-west-2",
    endpoint: "https://dynamodb.us-west-2.amazonaws.com"
})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()



router.get('/', async function(req, res) {
    const userInfo = await getUserInfo(req.query.email)

    if (userInfo === undefined) {
        res.status(500).send('Failure')
        return
    }


    if (userInfo.resetCode === req.query.code) {
        deleteRowFromTable('PasswordChangeRequests', 'email', req.query.email)
        res.status(200).send('Success')
        return
    }

    res.status(500).send('Failure')
})


async function getUserInfo(email) {
    const params = {
        TableName: 'PasswordChangeRequests',
        Key: {
            email: email
        }
    }

    try {
        const user = await DynamoDB_client.get(params).promise()
        return user.Item
    } catch (err) {
        console.log('\n')
        console.log(err)
        return undefined
    }
}


function deleteRowFromTable(table, key, value) {
    const params = {
        TableName: table,
        Key: {
            [key]: value
        }
    }

    try {
        DynamoDB_client.delete(params).promise()
    } catch (err) {
        console.log("An error occurred")
        console.log(err)
    }
}


module.exports = router
