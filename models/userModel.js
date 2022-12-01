const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter a username'],
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: [true, 'Please enter an email'],
      unique: true,
      trim: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please enter a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please enter a password'],
      minlength: [4, 'Please enter a password with at least 4 characters'],
      //   maxLength: [23, 'Please enter a password with at most 23 characters'],
    },
    photo: {
      type: String,
      required: [true, 'Please enter a photo'],
      default:
        'https://res.cloudinary.com/storage-b0x/image/upload/v1666817035/nicey/avatar_ybymb3.jpg',
    },
    phone: {
      type: String,
      default: '+802-867-5309',
    },
    bio: {
      type: String,
      maxLength: [250, 'Please enter a bio with at most 250 characters'],
      default: 'bio',
    },
  },
  {
    timestamps: true,
  }
)

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next()
  }
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(this.password, salt)
  this.password = hashedPassword
  next()
})

const User = mongoose.model('User', userSchema)

module.exports = User
