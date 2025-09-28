
const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const DeliveryDetails = require('../models/DeliveryDetails');
const DeliveryPerson = require('../models/DeliveryPerson');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * - Order must belong to the logged-in user
 * - Only for delivery orders, and only after status === 'delivered'
 * - Saves the rating on DeliveryDetails (one-time)
 * - Updates DeliveryPerson average rating atomically
 */
router.post('/orders/:id/rate-delivery', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const userId = req.user?.userId;

    // Basic validation
    if (typeof rating !== 'number' || Number.isNaN(rating) || rating < 0 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be a number between 0 and 5' });
    }
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // 1) Order must belong to this user
    const order = await Order.findOne({ _id: id, userId: String(userId) });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // 2) Only delivery orders can be rated; only after delivered
    if (order.method !== 'delivery') {
      return res.status(400).json({ message: 'Only delivery orders can be rated' });
    }
    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'You can rate only after delivery' });
    }

    // 3) Must have DeliveryDetails
    const dd = await DeliveryDetails.findOne({ orderId: order._id });
    if (!dd) return res.status(400).json({ message: 'Delivery record not found' });

    // 4) Prevent double rating
    if (dd.rating !== null) {
      return res.status(409).json({ message: 'This delivery is already rated' });
    }

    // 5) Save rating on DeliveryDetails
    dd.rating = Number(rating);
    dd.ratedBy = new mongoose.Types.ObjectId(userId);
    await dd.save();

    // 6) Update DeliveryPerson's average rating atomically (handles missing/null fields)
    //    Uses old values from the doc (curCount, curAvg), then computes new avg/count.
    await DeliveryPerson.updateOne(
      { _id: dd.deliveryPersonId },
      [
        {
          $set: {
            totalRatingsCount: {
              $add: [{ $ifNull: ['$totalRatingsCount', 0] }, 1],
            },
            rating: {
              $let: {
                vars: {
                  curCount: { $ifNull: ['$totalRatingsCount', 0] },
                  curAvg: { $ifNull: ['$rating', 0] },
                  newR: { $literal: Number(rating) },
                },
                in: {
                  $divide: [
                    { $add: [{ $multiply: ['$$curAvg', '$$curCount'] }, '$$newR'] },
                    { $add: ['$$curCount', 1] },
                  ],
                },
              },
            },
          },
        },
      ]
    );

    return res.json({ message: 'Thanks for your rating!' });
  } catch (err) {
    console.error('rate-delivery error', err);
    return res.status(500).json({ message: 'Failed to submit rating' });
  }
});

module.exports = router;
