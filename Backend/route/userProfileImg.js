const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware'); // <-- Your custom middleware

const router = express.Router();

// Create upload folder if not exists
const uploadDir = path.join(__dirname, '..', 'profile-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${req.user.userId}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// POST /api/user/upload-profile-pic
router.post(
  '/upload-profile-pic',
  verifyToken, // middleware to verify token and set req.user
  upload.single('profilePic'), // <--- must match frontend field name
  async (req, res) => {
    try {
      const userId = req.user.userId;

      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

      const newPath = `profile-images/${req.file.filename}`;

      // Get existing user to remove old profilePic
      const user = await User.findById(userId);
      if (user && user.profilePic) {
        const oldImagePath = path.join(__dirname, '..', user.profilePic);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new path
      user.profilePic = newPath;
      await user.save();

      res.status(200).json({
        message: 'Profile image uploaded successfully',
        profilePic: newPath,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Upload failed' });
    }
  }
);

module.exports = router;