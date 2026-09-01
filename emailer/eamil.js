// emailer/email.js
const nodemailer = require("nodemailer");

async function sendOtpEmail(to, otp) {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: "pandurangmapari687@gmail.com", 
            pass: "rjpl gyie xtyy eowt"         
        }
    });

    await transporter.sendMail({
        from: '"Your Shop" <pandurangmapari687@gmail.com>',
        to,
        subject: "OTP for Password Reset",
        html: `<p>Your OTP for password reset is: <b>${otp}</b></p>`
    });
}

module.exports = sendOtpEmail;
