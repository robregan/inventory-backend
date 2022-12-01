const asyncHandler = require('express-async-handler')
const User = require('../models/userModel.js')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const Token = require('../models/tokenModel.js')
const crypto = require('crypto')
const sendEmail = require('../utils/sendEmail.js')

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  })
}

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    res.status(400)
    throw new Error('Please fill out all required fields')
  }
  if (password.length < 4) {
    res.status(400)
    throw new Error('Password must be at least 4 characters')
  }
  const userExists = await User.findOne({ email })

  if (userExists) {
    res.status(400)
    throw new Error('Email has already been registered')
  }

  const user = await User.create({
    name,
    email,
    password,
  })

  const token = generateToken(user._id)

  // send http-only cookie
  res.cookie('token', token, {
    path: '/',
    httpOnly: true,
    expiresIn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    secure: true,
    sameSite: 'none',
  })

  if (user) {
    const { _id, name, email, photo, phone, bio } = user
    res.status(201).json({
      _id,
      name,
      email,
      photo,
      phone,
      bio,
      token,
    })
  } else {
    res.status(400)
    throw new Error('Invalid user data')
  }
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400)
    throw new Error('Please fill out all required fields')
  }
  const user = await User.findOne({ email })
  if (!user) {
    res.status(400)
    throw new Error('User not found, please register')
  }

  const passwordIsValid = await bcrypt.compare(password, user.password)

  const token = generateToken(user._id)

  // send http-only cookie
  res.cookie('token', token, {
    path: '/',
    httpOnly: true,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    secure: true,
    sameSite: 'none',
  })

  if (user && passwordIsValid) {
    const { _id, name, email, photo, phone, bio } = user
    res.status(200).json({
      _id,
      name,
      email,
      photo,
      phone,
      bio,
      token,
    })
  } else {
    res.status(400)
    throw new Error('Invalid email or password')
  }
})

const logout = asyncHandler(async (req, res) => {
  res.cookie('token', '', {
    path: '/',
    httpOnly: true,
    expires: new Date(0),
    secure: true,
    sameSite: 'none',
  })

  return res.status(200).json({
    message: 'Logged out',
  })
})

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (user) {
    const { _id, name, email, photo, phone, bio } = user
    res.status(200).json({
      _id,
      name,
      email,
      photo,
      phone,
      bio,
    })
  } else {
    res.status(404)
    throw new Error('User not found')
  }
})

// get logged in status

const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token
  if (!token) {
    return res.json(false)
  }

  // verify token
  const verified = jwt.verify(token, process.env.JWT_SECRET)
  if (verified) {
    return res.json(true)
  }
  return res.json(false)
})

// update user profile
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (user) {
    const { name, email, photo, phone, bio } = user
    user.name = req.body.name || name
    user.email = email
    user.phone = req.body.phone || phone
    user.photo = req.body.photo || photo
    user.bio = req.body.bio || bio

    // if (req.body.password) {
    // user.password = req.body.password
    // }

    const updatedUser = await user.save()

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
    })
  } else {
    res.status(404)
    throw new Error('User not found')
  }
})

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  const { oldPassword, password } = req.body

  if (!user) {
    res.status(404)
    throw new Error('User not found, please sign up ')
  }

  if (!oldPassword || !password) {
    res.status(400)
    throw new Error('Please fill out all required fields')
  }

  // check if pass matches w db
  const passwordIsValid = await bcrypt.compare(oldPassword, user.password)

  if (user && passwordIsValid) {
    user.password = password
    await user.save()
    res.status(200).send({
      message: 'Password updated',
    })
  } else {
    res.status(400)
    throw new Error('Invalid password')
  }
})

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email })
  if (!user) {
    res.status(404)
    throw new Error('User not found, please sign up ')
  }

  // delete token if one exists in the db
  let token = await Token.findOne({ userId: user._id })
  if (token) {
    await token.deleteOne()
  }

  // create reset token
  let resetToken = crypto.randomBytes(20).toString('hex') + user._id
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  // save token to db
  await new Token({
    userId: user._id,
    token: hashedToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * (60 * 1000), // 30 mins
  }).save()

  // construct reset url
  const resetUrl = `${process.env.CLIENT_URL}/resetpassword/${resetToken}`

  // reset email
  const message = `
    <h2>Hello ${user.name}</h2>
    <p>Please use the url below to reset your password</p>
    <p>This reset link is only valid for 30 minutes</p>
    <a href=${resetUrl} clicktracking=off>${resetUrl}</a>
    <span>Cheers!</span>

    `

  const subject = 'Password Reset'
  const sendTo = user.email
  const sentFrom = process.env.EMAIL_USER

  try {
    await sendEmail(subject, message, sendTo, sentFrom)
    res.status(200).json({
      success: true,
      message: 'Password reset email sent',
    })
  } catch (error) {
    res.status(500)
    throw new Error('Error sending email')
  }
})

// reset password
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body
  const { resetToken } = req.params

  // hash token, then compare to hashed token in db..
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

  // find token in db
  const userToken = await Token.findOne({
    token: hashedToken,
    expiresAt: { $gt: Date.now() },
  })

  if (!userToken) {
    res.status(404)
    throw new Error('Invalid or expired token')
  }

  // find user
  const user = await User.findOne({ _id: userToken.userId })
  user.password = password
  await user.save()
  res.status(200).json({
    success: true,
    message: 'Password reset successful, please login',
  })
})

module.exports = {
  registerUser,
  loginUser,
  logout,
  getUser,
  loginStatus,
  updateUser,
  changePassword,
  forgotPassword,
  resetPassword,
}
