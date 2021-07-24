const express = require('express')
const router = express.Router()
const randomstring = require('randomstring')

const AWS = require('aws-sdk')
AWS.config.update({
    region: "us-west-2",
    endpoint: "https://dynamodb.us-west-2.amazonaws.com"
})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()


router.post('/', async function(req, res) {
    console.log('\n\nsend-account-activation-code')

    const newActivationCode = randomstring.generate({length: 6, charset: 'numeric'})

    let status = await updateActivationCode(req.body.email, newActivationCode)

    if (status === "ERROR-OCCURRED") {
        res.status(500).send("aN ERROR")
        return
    }


    sendEmailActivationCode(req.body.email, newActivationCode)

    res.status(200).send("Success")
})


async function updateActivationCode(email, activationCode) {
    console.log('updateActivationCode()')

    const params = {
        TableName: 'UnactivatedAccounts',
        Key: {
            email: email
        },
        UpdateExpression: "set activationCode = :c",
        ExpressionAttributeValues: {
            ":c": activationCode
        },
        ReturnValues:"UPDATED_NEW"
    }

    await DynamoDB_client.update(params, function(err, data) {
        if (err) {
            console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2))
            return "ERROR-OCCURRED"
        }
        else {
            console.log(data)
            console.log('-------------------------')
            console.log("UpdateItem succeeded:", JSON.stringify(data, null, 2))
            return "Success"
        }
    })
}


function sendEmailActivationCode(email, activationCode) {
    console.log('\n\nsendEmailActivationCode() called')


    const SibApiV3Sdk = require('sib-api-v3-sdk')
    const api = new SibApiV3Sdk.TransactionalEmailsApi()
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()

    console.log('activationCode = ' + activationCode + '\n')

    sendSmtpEmail = {
        to: [{
            email: email
        }],
        templateId: 1,
        params: {
            activationCode: activationCode
        },
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }

    api.sendTransacEmail(sendSmtpEmail).then(function(data) {
      console.log('API called successfully. Returned data: ' + data)
    }, function(error) {
      console.error(error)
    })
}


module.exports = router
