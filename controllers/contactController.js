const asyncHandler = require('express-async-handler')
const User = require('../models/userModel.js')
const sendEmail = require('../utils/sendEmail.js')

const contactUs = asyncHandler(async (req, res) => {
  const { subject, message } = req.body
  const user = await User.findById(req.user._id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  if (!subject || !message) {
    res.status(400)
    throw new Error('Please fill in all fields')
  }
  const sendTo = process.env.EMAIL_USER
  const sentFrom = process.env.EMAIL_USER
  const replyTo = user.email
  try {
    await sendEmail(subject, message, sendTo, sentFrom, replyTo)
    res.status(200).json({
      success: true,
      message: 'Email sent',
    })
  } catch (error) {
    res.status(500)
    throw new Error('Error sending email')
  }
})

module.exports = {
  contactUs,
}
