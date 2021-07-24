const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')

const AWS = require('aws-sdk')
AWS.config.update({
    region: "us-west-2",
    endpoint: "https://dynamodb.us-west-2.amazonaws.com"
})
const DynamoDB_client = new AWS.DynamoDB.DocumentClient()

// ------------------------------------
// For accessing the SendInBlue API
const SibApiV3Sdk = require('sib-api-v3-sdk')
const defaultClient = SibApiV3Sdk.ApiClient.instance


// Configure API key authorization: api-key
const apiKey = defaultClient.authentications['api-key']
apiKey.apiKey = process.env.Sib_API_Key



router.get('/', async function(req, res) {
    console.log('\n\nverify-activation-code')

    const userInfo = await getUserInfo(req.query.email)

    if (userInfo === "ERROR-OCCURRED") {
        res.status(500).send("An error occurred")
        return
    }

    console.log("\n\nPLAYER-1:")
    console.log(userInfo)
    console.log("-------------------------------------------->>>>>>>>>>>>>>>>>>>>>>>\n")


    if (userInfo !== undefined && userInfo.activationCode === req.query.code) {
        let status = await deleteRowFromTable('UnactivatedAccounts', 'email', req.query.email)

        if (status === "ERROR-OCCURRED") {
            res.status(500).send("An error occurred")
            return
        }


        userInfo.id = uuidv4()
        delete userInfo.activationCode
        delete userInfo.expirationTime

        status = await createContact(req.query.email, userInfo)

        console.log("\n\n\nAFTER createContact() called:")
        console.log(status)
        console.log("=================================================================\n\n")

        if (status === "ERROR-OCCURRED") {
            res.status(500).send("An error occurred")
            return
        }


        res.status(200).send("Success")
        return
    }


    res.status(500).send('Please enter the code sent to your email address')
})


async function getUserInfo(email) {
    const params = {
        TableName: 'UnactivatedAccounts',
        Key: {
            email: email
        }
    }

    try {
        const user = await DynamoDB_client.get(params).promise()
        return user.Item
    } catch (err) {
        console.log("An error occurred - verify-account-activation-code.js - getUserInfo()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function deleteRowFromTable(table, key, value) {
    const params = {
        TableName: table,
        Key: {
            [key]: value
        }
    }

    try {
        await DynamoDB_client.delete(params).promise()
        return "Success"
    } catch (err) {
        console.log("An error occurred - verify-account-activation-code.js - deleteRowFromTable()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


async function createContact(email, userInfo) {
    console.log('\n\ncreateContact()')

    const api = new SibApiV3Sdk.ContactsApi()
    const createContact = new SibApiV3Sdk.CreateContact()
    createContact.email = email


    let result = null

    await api.createContact(createContact)
        .then(async function(data) {
            console.log('API called successfully')
            console.log(data)

            const status = await addRowIntoTable('Users', userInfo)

            if (status === "ERROR-OCCURRED")
                return "ERROR-OCCURRED"

            sendWelcomeEmail(email)

            result = "Success"
        }, function(error) {
            console.log('\n\nAn error occurred - verify-account-activation-code.js - createContact()\n')
            console.error(error)
            result = "ERROR-OCCURRED"
        })

    console.log('\nexiting createContact()\n')
    return result
}


async function addRowIntoTable(table, userInfo) {
    const params = {
        TableName: table,
        Item: userInfo
    }

    try {
        await DynamoDB_client.put(params).promise()
        return "Success"
    } catch (err) {
        console.log("An error occurred - verify-account-activation-code.js - addRowIntoTable()")
        console.log(err)
        return "ERROR-OCCURRED"
    }
}


function sendWelcomeEmail(email) {
    console.log('\n\nsendWelcomeEmail()')

    const api = new SibApiV3Sdk.TransactionalEmailsApi()
    let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail()

    sendSmtpEmail = {
        to: [{
            email: email
        }],
        templateId: 3,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    }

    api.sendTransacEmail(sendSmtpEmail).then(function(data) {
      console.log('API called successfully. Returned data: ' + data);
    }, function(error) {
      console.error(error.message)
    })
}





module.exports = router
