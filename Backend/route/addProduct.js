// route/products.js
const express = require('express');
const multer = require('multer');
const path = require('path');

const Product = require('../models/Product');
const Canteen = require('../models/Canteen');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/* ---------- Multer setup ---------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'product-images'),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/\s+/g, '_');
    cb(null, Date.now() + '-' + safe);
  },
});
const fileFilter = (req, file, cb) => {
  const ok = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(ok.includes(ext) ? null : new Error('Only image files are allowed'), ok.includes(ext));
};
const upload = multer({ storage, fileFilter });

/**
 * POST /api/products
 * body: name, description, price, (image file)
 * Uses manager JWT: sets sellerId = managerId (as String) and canteenId from that manager's canteen.
 */
router.post('/addproducts', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const { name, description = '', price } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ message: 'name and price are required' });
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: 'price must be a non-negative number' });
    }

    // find canteen owned by this manager
    const canteen = await Canteen.findOne({ managerId }).select('_id');
    if (!canteen) {
      return res.status(404).json({ message: 'No canteen for this manager' });
    }

    const imagePath = req.file ? `product-images/${req.file.filename}` : '';

    const product = await Product.create({
      canteenId: canteen._id,
      name,
      description,
      price: numericPrice,
      image: imagePath,
      sellerId: managerId,
    });

    return res.status(201).json({ message: 'Product created', product });
  } catch (err) {
    console.error('POST /products error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
