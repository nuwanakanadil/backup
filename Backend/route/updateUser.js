const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticate = require('../middleware/authMiddleware'); // fixes below

router.put('/update-profile', authenticate, async (req, res) => {
  const { firstName, lastName, email, phone, universityId } = req.body;

  // Validate inputs
  if (!firstName || !lastName || !email || !phone) {
    return res.status(400).json({ message: 'Required fields missing' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\d{10}$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ message: 'Phone must be exactly 10 digits' });
  }

  try {
    const userId = req.user.userId || req.body.userId; // fallback

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: user ID missing' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, email, phone, universityId },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated', updatedUser });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;