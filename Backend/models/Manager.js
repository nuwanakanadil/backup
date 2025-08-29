const mongoose = require('mongoose');
const validator = require('validator');

const managerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    validate: {
      validator: (value) => /^[0-9]{10}$/.test(value),
      message: 'Phone number must be 10 digits',
    },
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    validate: [validator.isEmail, 'Invalid email'],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  profilePic: {
    type: String,
    default: '', // or default: 'default.jpg' if you want to assign a placeholder image
  }
}, { timestamps: true });

module.exports = mongoose.model('Manager', managerSchema);
