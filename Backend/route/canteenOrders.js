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
    const managerId = req.user?.managerId;
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

// Require login + canteen role
function requireCanteen(req, res, next) {
  if (!req.user || !req.user.canteenId) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  next();
}

/**
 * GET /api/canteen/order-sessions?status=placed|cooking|ready|out_for_delivery|finished
 * Groups orders by sessionTs for the manager's canteen.
 * - finished => status in ['delivered','picked']
 * - others   => status equals given value
 */
router.get('/order-sessions', authMiddleware, attachCanteen, requireCanteen, async (req, res) => {
  try {
    const { status = 'placed' } = req.query;

    const statusMatch =
      status === 'finished'
        ? { $in: ['delivered', 'picked'] }
        : status; // placed|cooking|ready|out_for_delivery

    const pipeline = [
      {
        $match: {
          canteenId: new mongoose.Types.ObjectId(req.user.canteenId),
          status: statusMatch instanceof Object ? statusMatch : status,
        }
      },
      { $sort: { createdAt: 1 } },
      { $addFields: { userIdObj: { $toObjectId: '$userId' } } },

      {
        $group: {
          _id: '$sessionTs',
          sessionTs: { $first: '$sessionTs' },
          userIdObj: { $first: '$userIdObj' },
          createdAtMin: { $min: '$createdAt' },
          createdAtMax: { $max: '$createdAt' },
          totalAmount: { $sum: '$totalAmount' },
          itemCount: { $sum: 1 },
          methods: { $addToSet: '$method' },
          orderIds: { $push: '$_id' },
          items: {
            $push: {
              orderId: '$_id',
              itemId: '$itemId',
              itemName: '$itemName',
              quantity: '$quantity',
              method: '$method',
              totalAmount: '$totalAmount',
              price: '$price',
              status: '$status',
              createdAt: '$createdAt',
              address: '$address',
              Paymentmethod: '$Paymentmethod',
              img: '$img'
            }
          }
        }
      },

      // join user
      {
        $lookup: {
          from: 'users',
          localField: 'userIdObj',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

      // get ALL delivery assignments in this session (not just latest)
      {
        $lookup: {
          from: 'deliverydetails',
          let: { orderIds: '$orderIds' },
          pipeline: [
            { $match: { $expr: { $in: ['$orderId', '$$orderIds'] } } },
            { $project: { deliveryPersonId: 1, orderId: 1, assignedAt: 1, deliveredAt: 1 } }
          ],
          as: 'allDD'
        }
      },

      // join all delivery people referenced above
      {
        $lookup: {
          from: 'deliverypeople',
          localField: 'allDD.deliveryPersonId',
          foreignField: '_id',
          as: 'allDP'
        }
      },

      // latest assignment (for "assigned" chip in some views)
      {
        $addFields: {
          latestDD: {
            $first: {
              $sortArray: { input: '$allDD', sortBy: { assignedAt: -1 } }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'deliverypeople',
          localField: 'latestDD.deliveryPersonId',
          foreignField: '_id',
          as: 'latestDP'
        }
      },
      { $unwind: { path: '$latestDP', preserveNullAndEmptyArrays: true } },

      {
        $project: {
          _id: 0,
          sessionTs: 1,
          createdAtMin: 1,
          createdAtMax: 1,
          totalAmount: 1,
          itemCount: 1,
          methods: 1,
          items: 1,

          // unique delivery person names for the session (used in "out_for_delivery" tab)
          deliveryPersons: {
            $setUnion: [
              {
                $map: {
                  input: '$allDP',
                  as: 'p',
                  in: '$$p.name'
                }
              },
              [] // ensure array
            ]
          },

          customerName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$user.firstName', ''] },
                  ' ',
                  { $ifNull: ['$user.lastName', ''] }
                ]
              }
            }
          },

          // latest assignment summary (used in "not assigned/assigned" chip in other tabs)
          assignment: {
            deliveryPersonId: '$latestDP._id',
            deliveryPersonName: '$latestDP.name',
            deliveryPersonRating: '$latestDP.rating',
            assignedAt: '$latestDD.assignedAt',
            deliveredAt: '$latestDD.deliveredAt'
          }
        }
      },

      { $sort: { createdAtMax: -1 } }
    ];

    const sessions = await Order.aggregate(pipeline);
    return res.json({ sessions });
  } catch (err) {
    console.error('GET /order-sessions error:', err);
    return res.status(500).json({ message: 'Failed to load order sessions' });
  }
});

/**
 * POST /api/canteen/order-sessions/:sessionTs/assign-delivery
 * Assigns a fair driver to all ready+delivery orders in the session and moves them to out_for_delivery
 */
router.post('/order-sessions/:sessionTs/assign-delivery', authMiddleware, attachCanteen, requireCanteen, async (req, res) => {
  try {
    const { sessionTs } = req.params;

    // only READY + DELIVERY orders should be assigned
    const orders = await Order.find({
      canteenId: req.user.canteenId,
      sessionTs: Number(sessionTs),
      status: 'ready',
      method: 'delivery'
    }).lean();

    if (!orders.length) {
      return res.status(404).json({ message: 'No ready delivery orders in this session' });
    }

    const orderIds = orders.map(o => o._id);
    const existing = await DeliveryDetails.find({ orderId: { $in: orderIds } }, { orderId: 1 }).lean();
    const alreadyAssignedIds = new Set(existing.map(e => e.orderId.toString()));

    const toAssign = orders.filter(o => !alreadyAssignedIds.has(o._id.toString()));
    if (!toAssign.length) {
      return res.json({ message: 'All ready delivery orders in this session already assigned', assigned: null });
    }

    const chosen = await chooseDeliveryPerson();
    if (!chosen) return res.status(409).json({ message: 'No active delivery persons available' });

    const now = new Date();

    await Promise.all([
      DeliveryDetails.insertMany(
        toAssign.map(o => ({
          orderId: o._id,
          deliveryPersonId: chosen._id,
          assignedAt: now
        }))
      ),
      Order.updateMany(
        { _id: { $in: toAssign.map(o => o._id) } },
        { $set: { status: 'out_for_delivery' } }
      ),
      DeliveryPerson.updateOne(
        { _id: chosen._id },
        { $inc: { totalAssigned: toAssign.length }, $set: { lastAssignedAt: now } }
      )
    ]);

    return res.json({
      message: 'Delivery person assigned for session',
      countAffected: toAssign.length,
      assigned: {
        deliveryPersonId: chosen._id,
        deliveryPersonName: chosen.name,
        rating: chosen.rating ?? 0,
        assignedAt: now
      }
    });
  } catch (err) {
    console.error('POST /order-sessions/:sessionTs/assign-delivery error:', err);
    return res.status(500).json({ message: 'Failed to assign delivery person for session' });
  }
});

/**
 * POST /api/canteen/order-sessions/:sessionTs/update-status
 * Body: { toStatus: 'cooking'|'ready'|'picked', method?: 'pickup'|'delivery' }
 * NOTE: Updates ALL orders in this session (optionally filtered by method).
 */
router.post('/order-sessions/:sessionTs/update-status', authMiddleware, attachCanteen, requireCanteen, async (req, res) => {
  try {
    const { sessionTs } = req.params;
    const { toStatus, method } = req.body || {};

    const allowed = ['cooking', 'ready', 'picked'];
    if (!allowed.includes(toStatus)) {
      return res.status(400).json({ message: `Invalid toStatus. Allowed: ${allowed.join(', ')}` });
    }

    const query = {
      canteenId: req.user.canteenId,
      sessionTs: Number(sessionTs),
    };
    if (method) query.method = method;

    const result = await Order.updateMany(query, { $set: { status: toStatus } });
    return res.json({ message: 'Status updated', matched: result.matchedCount ?? result.nMatched, modified: result.modifiedCount ?? result.nModified });
  } catch (err) {
    console.error('POST /order-sessions/:sessionTs/update-status error:', err);
    return res.status(500).json({ message: 'Failed to update status' });
  }
});

// ---- Helpers ----
const WINDOW_DAYS = 7;
const EPSILON = 0.7;

function softmaxPick(items, scoreFn) {
  const scores = items.map(scoreFn);
  const max = Math.max(...scores);
  const exps = scores.map(s => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  let r = Math.random() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= exps[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

async function chooseDeliveryPerson() {
  const activeDrivers = await DeliveryPerson.find({ status: 'active' }).lean();
  if (!activeDrivers.length) return null;

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const counts = await DeliveryDetails.aggregate([
    { $match: { assignedAt: { $gte: since } } },
    { $group: { _id: '$deliveryPersonId', c: { $sum: 1 } } }
  ]);

  const countMap = new Map(counts.map(c => [c._id.toString(), c.c]));
  const withCounts = activeDrivers.map(d => ({
    ...d,
    recentCount: countMap.get(d._id.toString()) || 0,
  }));

  const minCount = Math.min(...withCounts.map(d => d.recentCount));
  let candidates = withCounts.filter(d => d.recentCount === minCount);

  if (candidates.length === 1) {
    return candidates[0];
  }

  if (Math.random() < EPSILON) {
    candidates = candidates.sort(() => Math.random() - 0.5);
    candidates.sort((a, b) => {
      const ta = a.lastAssignedAt ? new Date(a.lastAssignedAt).getTime() : 0;
      const tb = b.lastAssignedAt ? new Date(b.lastAssignedAt).getTime() : 0;
      return ta - tb;
    });
    return candidates[0];
  } else {
    const picked = softmaxPick(candidates, d => (d.rating ?? 0));
    return picked;
  }
}

module.exports = router;
