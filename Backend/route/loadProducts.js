const express = require('express');
const Product = require('../models/Product');
const Canteen = require('../models/Canteen');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
/**
 * GET /api/products/mine
 * Returns all products for the canteen owned by the logged-in manager.
 */
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteen = await Canteen.findOne({ managerId }).select('_id');
    if (!canteen) return res.status(404).json({ message: 'No canteen for this manager' });

    const products = await Product.find({ canteenId: canteen._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ products, productCount: products.length });
  } catch (err) {
    console.error('GET /products/mine error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;