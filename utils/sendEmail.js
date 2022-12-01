const nodemailer = require('nodemailer')

const sendEmail = async (subject, message, sendTo, sentFrom, replyTo) => {
  // create reusable transporter object
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },

    // activate http option
    // tls: {
    //     rejectUnauthorized: false,

    // }
  })

  const options = {
    from: sentFrom,
    to: sendTo,
    subject: subject,
    html: message,
    replyTo: replyTo,
  }

  transporter.sendMail(options, function (err, info) {
    if (err) {
      console.log(err)
    } else {
      console.log(info)
    }
  })
}

module.exports = sendEmail
