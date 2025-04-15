const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { sendSms } = require("./twilioService");
const otpStore = {}; // temporary storage

const app = express();

// enable CORS for all routes
app.use(cors());
app.use(bodyParser.json());

// send OTP
app.post("/send-otp", (req, res) => {
    const { phone } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000); // generate OTP
    otpStore[phone] = otp;

    sendSms(phone, `Your OTP is: ${otp}`)
        .then(() => res.json({ success: true }))
        .catch((error) => res.status(500).json({ success: false, error }));
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
    const { phone, otp } = req.body;
    if (otpStore[phone] && otpStore[phone] === parseInt(otp)) {
        delete otpStore[phone]; // clear OTP after verification
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: "Invalid OTP" });
    }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
