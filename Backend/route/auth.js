const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Manager = require('../models/Manager');
const authMiddleware = require('../middleware/authMiddleware');



const router = express.Router();

router.post('/signup', async (req, res) => {
  const {
    firstName,
    lastName,
    universityId,
    phone,
    email,
    password,
    confirmPassword,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !universityId ||
    !phone ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      universityId,
      phone,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// manager signup route
router.post('/managersignup', async (req, res) => {
  const {
    firstName,
    lastName,
    phone,
    email,
    password,
    confirmPassword,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !phone ||
    !email ||
    !password ||
    !confirmPassword
  ) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newmanager = new Manager({
      firstName,
      lastName,
      phone,
      email,
      password: hashedPassword,
    });

    await newmanager.save();
    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// POST /api/auth/login  - user login

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ email });

    if (!user)
      return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(401).json({ message: 'Invalid password or Email' });

    const payload = {
       userId: user._id, 
       email: user.email, 
       role: 'customer' 
      };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res
      .cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      })
      
      .status(200)
      .json({ message: 'Login successful', userId: user._id, email: user.email, role: 'customer' });
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// manager Login


router.post('/managerlogin', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // ❗ DO NOT shadow the imported Manager model
    const manager = await Manager.findOne({ email });

    if (!manager)
      return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, manager.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid password or Email' });

     const payload = { 
      managerId: manager._id,
       email: manager.email,
        role: 'manager'
       };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    res
      .cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 24 * 60 * 60 * 1000
      })
      .status(200)
      .json({ message: 'Login successful', managerId: manager._id, email: manager.email, role: 'manager' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// route/auth.js
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });
  res.status(200).json({ message: 'Logged out successfully' });
});


//delete account
router.delete('/delete-account', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // find the authenticated user
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found or already deleted' });
    }

    // verify password matches
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // delete the user
    await User.deleteOne({ _id: user._id });

    // clear auth cookie (invalidate session)
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    });

    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
