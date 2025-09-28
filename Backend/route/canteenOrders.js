// routes/canteenOrders.js
const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const DeliveryPerson = require('../models/DeliveryPerson');
const DeliveryDetails = require('../models/DeliveryDetails');
const Canteen = require('../models/Canteen');

const router = express.Router();

/** Attach canteenId to req.user using managerId (userId in JWT) */
async function attachCanteen(req, res, next) {
  try {
    const managerId = req.user?.managerId;   // <— CHANGED: managerId, not userId
    if (!managerId) return res.status(401).json({ message: 'Unauthorized' });

    const canteen = await Canteen.findOne({ managerId }).select('_id');
    if (!canteen) return res.status(403).json({ message: 'No canteen for this manager' });

    req.user.canteenId = canteen._id.toString();
    next();
  } catch (err) {
    console.error('attachCanteen error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}


// Require login + canteen role (replace with your own middleware)
function requireCanteen(req, res, next) {
  // Example: req.user = { _id, role, canteenId }
  if (!req.user || !req.user.canteenId) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  next();
}

/**
 * GET /api/canteen/orders
 * Query: status=placed
 * Returns all orders for the manager's canteen, joined with customer name.
 */
router.get('/orders', authMiddleware, attachCanteen, requireCanteen, async (req, res) => {
  try {
    const { status = 'placed' } = req.query;

    const pipeline = [
      { $match: { canteenId: new mongoose.Types.ObjectId(req.user.canteenId), status } },

      // Join customer (users) — userId is stored as String in Order
      { $addFields: { userIdObj: { $toObjectId: '$userId' } } },
      {
        $lookup: {
          from: 'users',
          localField: 'userIdObj',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

      // Join DeliveryDetails by order _id
      {
        $lookup: {
          from: 'deliverydetails',
          localField: '_id',
          foreignField: 'orderId',
          as: 'dd',
        },
      },
      { $unwind: { path: '$dd', preserveNullAndEmptyArrays: true } },

      // Join DeliveryPerson by dd.deliveryPersonId
      {
        $lookup: {
          from: 'deliverypeople', // collection name is model lowercased & pluralized
          localField: 'dd.deliveryPersonId',
          foreignField: '_id',
          as: 'dp',
        },
      },
      { $unwind: { path: '$dp', preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 1,
          itemName: 1,
          quantity: 1,
          method: 1,
          totalAmount: 1,
          status: 1,
          createdAt: 1,

          // Customer full name
          customerName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$user.firstName', ''] },
                  ' ',
                  { $ifNull: ['$user.lastName', ''] },
                ],
              },
            },
          },

          // Assignment info from DeliveryDetails + DeliveryPerson
          assignment: {
            deliveryPersonId: '$dp._id',
            deliveryPersonName: '$dp.name',
            deliveryPersonRating: '$dp.rating',
            assignedAt: '$dd.assignedAt',
            deliveredAt: '$dd.deliveredAt',
          },
        },
      },

      { $sort: { createdAt: -1 } },
    ];

    const orders = await Order.aggregate(pipeline);
    res.json({ orders });
  } catch (err) {
    console.error('GET /canteen/orders error:', err);
    res.status(500).json({ message: 'Failed to load orders' });
  }
});

// ---- Helpers ----

const WINDOW_DAYS = 7;    // fairness window
const EPSILON = 0.7;      // 70% pure fairness, 30% rating-aware

// Softmax helper
function softmaxPick(items, scoreFn) {
  const scores = items.map(scoreFn);
  const max = Math.max(...scores);
  const exps = scores.map(s => Math.exp(s - max)); // numeric stability
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  let r = Math.random() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= exps[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Choose a fair delivery person among active ones.
 * Fairness: least assignments in WINDOW_DAYS.
 * Tie-break: epsilon-greedy (uniform vs rating-weighted), then least recently assigned.
 */
async function chooseDeliveryPerson() {
  const activeDrivers = await DeliveryPerson.find({ status: 'active' }).lean();
  if (!activeDrivers.length) return null;

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Count recent assignments per person
  const counts = await DeliveryDetails.aggregate([
    { $match: { assignedAt: { $gte: since } } },
    { $group: { _id: '$deliveryPersonId', c: { $sum: 1 } } }
  ]);

  const countMap = new Map(counts.map(c => [c._id.toString(), c.c]));
  const withCounts = activeDrivers.map(d => ({
    ...d,
    recentCount: countMap.get(d._id.toString()) || 0,
  }));

  // Keep only least-loaded set
  const minCount = Math.min(...withCounts.map(d => d.recentCount));
  let candidates = withCounts.filter(d => d.recentCount === minCount);

  if (candidates.length === 1) {
    return candidates[0];
  }

  // ε-greedy:
  if (Math.random() < EPSILON) {
    // 70%: purely fair — uniform among candidates
    candidates = candidates.sort(() => Math.random() - 0.5);
    // As a tiny nudge, prefer the one least recently assigned
    candidates.sort((a, b) => {
      const ta = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0;
      const tb = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0;
      return ta - tb; // older first
    });
    return candidates[0];
  } else {
    // 30%: rating-weighted softmax among candidates
    // Score = rating (0..5). Newcomers (0) still get some mass.
    const picked = softmaxPick(candidates, d => (d.rating ?? 0));
    return picked;
  }
}

// ---- Routes ----

/**
 * POST /api/canteen/orders/:id/assign-delivery
 * Assigns a fair delivery person and creates a DeliveryDetails row.
 * NOTE: does NOT modify the Order schema.
 */
router.post('/orders/:id/assign-delivery',authMiddleware, attachCanteen,requireCanteen, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate order
    const order = await Order.findOne({ _id: id, canteenId: req.user.canteenId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'placed') return res.status(400).json({ message: 'Only placed orders can be assigned' });
    if (order.method !== 'delivery') return res.status(400).json({ message: 'Only delivery orders can be assigned' });

    // Prevent duplicate assignment
    const existing = await DeliveryDetails.findOne({ orderId: order._id });
    if (existing) {
      const dp = await DeliveryPerson.findById(existing.deliveryPersonId).lean();
      return res.json({
        message: 'Order already assigned',
        assigned: {
          deliveryPersonId: dp?._id,
          deliveryPersonName: dp?.name,
          assignedAt: existing.assignedAt,
        }
      });
    }

    // Pick a person
    const chosen = await chooseDeliveryPerson();
    if (!chosen) return res.status(409).json({ message: 'No active delivery persons available' });

    // Save delivery details
    const details = await DeliveryDetails.create({
      orderId: order._id,
      deliveryPersonId: chosen._id,
      assignedAt: new Date(),
    });

    // Update delivery person stats
    await DeliveryPerson.updateOne(
      { _id: chosen._id },
      { $inc: { totalAssigned: 1 }, $set: { lastAssignedAt: new Date() } }
    );

    await Order.updateOne(
      { _id: order._id },
      { $set: { status: 'out_for_delivery' } }
    );

    return res.json({
      message: 'Delivery person assigned',
      assigned: {
        deliveryPersonId: chosen._id,
        deliveryPersonName: chosen.name,
        rating: chosen.rating ?? 0,
        assignedAt: details.assignedAt,
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to assign delivery person' });
  }
});

module.exports = router;
