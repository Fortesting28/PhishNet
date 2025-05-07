const twilio = require("twilio");
require("dotenv").config();

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.TWILIO_SECRET;
const fromPhone = process.env.TWILIO_PHONE;

const client = twilio(accountSid, authToken);

async function sendSms(to, message) {
    return client.messages.create({ body: message, from: fromPhone, to: to });
}

module.exports = { sendSms };
