// route/canteen.js
const express = require('express');
const router = express.Router();
const Canteen = require('../models/Canteen');
const authMiddleware = require('../middleware/authMiddleware');
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');

// Create or Update canteen for the logged-in manager
// POST /api/canteen
router.post('/createCanteen', authMiddleware, async (req, res) => {
  try {
    // Your manager JWT should contain { managerId, ... }
    const { managerId} = req.user || {};

    // (Optional) enforce role
    // if (role !== 'manager') return res.status(403).json({ message: 'Forbidden' });

    if (!managerId) {
      return res.status(401).json({ message: 'Unauthorized: managerId missing in token' });
    }

    const { name, lng, lat } = req.body;

    if (!name || typeof lng !== 'number' || typeof lat !== 'number') {
      return res.status(400).json({ message: 'name, lng, lat are required' });
    }

    const update = {
      name,
      location: { type: 'Point', coordinates: [lng, lat] },
      managerId,
    };

    // Upsert canteen by managerId (create if not exists, else update)
    const canteen = await Canteen.findOneAndUpdate(
      { managerId },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ message: 'Canteen saved successfully', canteen });
  } catch (err) {
    console.error(err);
    // Duplicate managerId unique error
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Canteen already exists for this manager' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteen = await Canteen.findOne({ managerId }).select('-__v');
    if (!canteen) return res.status(404).json({ message: 'No canteen for this manager' });

    // Return the canteen if needed (useful for dashboard prefill)
    return res.status(200).json({ canteen });
  } catch (err) {
    console.error('GET /canteen/mine error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    // get canteen (name + id)
    const canteen = await Canteen.findOne({ managerId }).select('_id name').lean();
    if (!canteen) return res.status(404).json({ message: 'No canteen for this manager' });

    // products of this canteen
    const products = await Product.find({ canteenId: canteen._id }).select('_id').lean();
    const productIds = products.map(p => String(p._id));
    const productCount = products.length;

    // if no products, quick return
    if (productIds.length === 0) {
      return res.json({
        name: canteen.name,
        productCount: 0,
        totalReviews: 0,
        overallRating: 0,
      });
    }

    // total reviews & average rating across all those products
    // NOTE: your Review schema has productId as String, so we match strings
    const agg = await Review.aggregate([
      { $match: { productId: { $in: productIds } } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          sumRatings: { $sum: '$rating' },
        }
      }
    ]);

    const totalReviews = agg.length ? agg[0].totalReviews : 0;
    const overallRating = totalReviews > 0 ? Number((agg[0].sumRatings / totalReviews).toFixed(1)) : 0;

    return res.json({
      name: canteen.name,
      productCount,
      totalReviews,
      overallRating,
    });
  } catch (err) {
    console.error('GET /canteen/summary error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


router.get('/order-stats', authMiddleware, async (req, res) => {
  try {
    const { managerId } = req.user || {};
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteen = await Canteen.findOne({ managerId }).select('_id').lean();
    if (!canteen) return res.status(404).json({ message: 'No canteen for this manager' });

    const [ongoing, completed] = await Promise.all([
      Order.countDocuments({ canteenId: canteen._id, status: { $in: ['placed', 'preparing'] } }),
      Order.countDocuments({ canteenId: canteen._id, status: 'completed' }),
    ]);

    return res.json({ ongoing, completed });
  } catch (err) {
    console.error('GET /canteen/order-stats error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
