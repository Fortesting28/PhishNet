const twilio = require("twilio");

const accountSid = "ACa994971108ae68ed5e0de4751c7f4c0c";
const authToken = "390e0b70ddddb68a89e24dd7ae8cc2ae";
const fromPhone = "+18444057912";

const client = twilio(accountSid, authToken);

async function sendSms(to, message) {
    return client.messages.create({ body: message, from: fromPhone, to: to });
}

module.exports = { sendSms };
