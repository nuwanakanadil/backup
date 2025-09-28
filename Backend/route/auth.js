const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Manager = require('../models/Manager');
const authMiddleware = require('../middleware/authMiddleware');
const router = express.Router();
const validator = require('validator');


// Signup Route
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

  // 1. Check required fields
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

  // 2. Validate email
  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  // 3. Validate phone (10 digits only – adjust regex if needed)
  if (!/^[0-9]{10}$/.test(phone)) {
    return res
      .status(400)
      .json({ message: 'Phone number must be exactly 10 digits' });
  }

  // 4. Validate password
  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: 'Password must be at least 6 characters long' });
  }

  // Optional: enforce strong password (letters + numbers)
  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
    return res
      .status(400)
      .json({ message: 'Password must include letters and numbers' });
  }

  // 5. Check password confirmation
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    // 6. Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const universityIdExists = await User.findOne({ universityId });
    if (universityIdExists) {
      return res.status(400).json({ message: 'University ID already exists' });
    }

    // 7. Hash password and save user
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
    // 1. Check required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // 2. Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // 3. Validate password strength (match your frontend: min 8, letters + numbers)
    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters long' });
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      return res
        .status(400)
        .json({ message: 'Password must include letters and numbers' });
    }

    // 4. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 5. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: 'Invalid password or Email' });
    }

    // 6. Generate JWT
    const payload = {
      userId: user._id,
      email: user.email,
      role: 'customer'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    // 7. Send cookie + response
    res
      .cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', // ✅ prevents CSRF
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      })
      .status(200)
      .json({
        message: 'Login successful',
        userId: user._id,
        email: user.email,
        role: 'customer'
      });

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
