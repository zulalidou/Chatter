const express = require('express');
const router = express.Router();
const randomstring = require('randomstring');

const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-west-2',
  endpoint: 'https://dynamodb.us-west-2.amazonaws.com',
});

// a simplified client for interacting with DynamoDB
const dynamoDbClient = new AWS.DynamoDB.DocumentClient();


router.post('/', async function(req, res) {
  const newActivationCode = randomstring.generate({length: 6, charset: 'numeric'});

  const status = await updateActivationCode(req.body.email, newActivationCode);

  if (status === 'ERROR-OCCURRED') {
    res.status(500).send('aN ERROR');
    return;
  }

  sendEmailActivationCode(req.body.email, newActivationCode);

  res.status(200).send('Success');
});


/*
 * Updates the user's activation code.
 */
async function updateActivationCode(email, activationCode) {
  const params = {
    TableName: 'UnactivatedAccounts',
    Key: {
      email: email,
    },
    UpdateExpression: 'set activationCode = :c',
    ExpressionAttributeValues: {
      ':c': activationCode,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  await dynamoDbClient.update(params, function(err, data) {
    if (err) {
      return 'ERROR-OCCURRED';
    } else {
      return 'Success';
    }
  });
}


/*
 * Sends the user an activation code to their email address.
 */
function sendEmailActivationCode(email, activationCode) {
  const SibApiV3Sdk = require('sib-api-v3-sdk');
  const api = new SibApiV3Sdk.TransactionalEmailsApi();
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail = {
    to: [{
      email: email,
    }],
    templateId: 1,
    params: {
      activationCode: activationCode,
    },
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  };

  api.sendTransacEmail(sendSmtpEmail).then(function(data) {
    console.log('API called successfully. Returned data: ' + data);
  }, function(error) {
    console.error(error);
  });
}


module.exports = router;
