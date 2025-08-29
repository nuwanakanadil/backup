const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/Manager'); // Your User model
const authMiddleware = require('../middleware/authMiddleware');
const Manager = require('../models/Manager');

router.get('/managerprofile', authMiddleware, async (req, res) => {
  try {
    const manager = await Manager.findById(req.user.managerId).select('-password'); // Exclude password
    if (!manager) return res.status(404).json({ message: 'User not found' });
    res.json(manager);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
// This route retrieves the user's profile details after verifying the JWT token.
// It uses the authMiddleware to ensure the user is authenticated before accessing their profile.