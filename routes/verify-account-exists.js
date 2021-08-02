const express = require('express')
const router = express.Router()

const AWS = require('aws-sdk')
AWS.config.update({region: "us-west-2", endpoint: "https://dynamodb.us-west-2.amazonaws.com"})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()


router.get('/', async function(req, res) {
    const userInfo = await getUserAccount(req.query.attribute, req.query.newValue)

    if (userInfo === undefined)
        res.send('ACCOUNT-DOES-NOT-EXIST')
    else
        res.send('ACCOUNT-EXISTS')
})


async function getUserAccount(attribute, value) {
    const params = {
        TableName: 'Users',
        IndexName: `${attribute}-index`, // attribute === username || email
        KeyConditionExpression: `${attribute} = :v`,
        ExpressionAttributeValues: {
            ':v' : value
        }
    }

    try {
        const users = await DynamoDB_client.query(params).promise()
        return users.Items[0]
    } catch (err) {
        console.log("An error occurred (home.js)")
        console.log(err)
        return null
    }
}

module.exports = router
