const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Product = require('../models/Product');
const Canteen = require('../models/Canteen');
const Manager = require('../models/Manager');
const auth = require('../middleware/authMiddleware'); // must set req.user with {userId or managerId, role}
const User = require('../models/User');
//
// POST /api/chat/start
// body: { productId }  (we derive canteen -> manager)
// returns: { conversationId, canteenName, managerName }
//
router.post('/chat/start', auth, async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: 'productId required' });

    const product = await Product.findById(productId).select('canteenId').lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const canteen = await Canteen.findById(product.canteenId).select('name managerId').lean();
    if (!canteen) return res.status(404).json({ message: 'Canteen not found' });

    const manager = await Manager.findById(canteen.managerId).select('firstName lastName').lean();
    if (!manager) return res.status(404).json({ message: 'Manager not found' });

    // Only customers initiate via product page
    if (!req.user?.userId) return res.status(401).json({ message: 'Login as customer required' });

    const userId = req.user.userId;
    const managerId = canteen.managerId;

    let convo = await Conversation.findOne({ userId, managerId, canteenId: canteen._id });
    if (!convo) {
      convo = await Conversation.create({
        userId,
        managerId,
        canteenId: canteen._id,
        canteenName: canteen.name,
        managerName: `${manager.firstName} ${manager.lastName}`
      });
    }

    return res.json({
      conversationId: convo._id,
      canteenName: convo.canteenName,
      managerName: convo.managerName
    });
  } catch (e) {
    console.error('POST /chat/start error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

//
// GET /api/chat/:conversationId/messages
//
router.get('/chat/:conversationId/messages', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const convo = await Conversation.findById(conversationId).lean();
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    // authz: user must be in convo
    const isUser = req.user?.userId && String(req.user.userId) === String(convo.userId);
    const isMgr = req.user?.managerId && String(req.user.managerId) === String(convo.managerId);
    if (!isUser && !isMgr) return res.status(403).json({ message: 'Forbidden' });

    const msgs = await Message.find({ conversationId }).sort({ createdAt: 1 }).lean();
    return res.json({
      canteenName: convo.canteenName,
      managerName: convo.managerName,
      messages: msgs
    });
  } catch (e) {
    console.error('GET /chat/:id/messages error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

//
// POST /api/chat/:conversationId/messages
// body: { text }
// (You can send via sockets too; this HTTP is handy for fallbacks/tests.)
//
router.post('/chat/:conversationId/messages', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'text required' });

    const convo = await Conversation.findById(conversationId);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    let senderType, senderId;
    if (req.user?.userId && String(req.user.userId) === String(convo.userId)) {
      senderType = 'user';
      senderId = req.user.userId;
      convo.unreadForManager = (convo.unreadForManager || 0) + 1;
    } else if (req.user?.managerId && String(req.user.managerId) === String(convo.managerId)) {
      senderType = 'manager';
      senderId = req.user.managerId;
      convo.unreadForUser = (convo.unreadForUser || 0) + 1;
    } else {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const msg = await Message.create({ conversationId, senderType, senderId, text });
    convo.lastMessage = text;
    await convo.save();

    // Emit via socket.io (if room active)
    req.app.get('io')?.to(String(conversationId)).emit('message', msg);

    res.status(201).json(msg);
  } catch (e) {
    console.error('POST /chat/:id/messages error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/chat/my-conversations', auth, async (req, res) => {
  try {
    // Be tolerant in case role wasn’t added to token yet
    const role = req.user?.role || (req.user?.managerId ? 'manager' : 'customer');

    const isCustomer = role === 'customer';
    const isManager = role === 'manager';
    if (!isCustomer && !isManager) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    
    const filter = isCustomer
      ? { userId: req.user.userId }
      : { managerId: req.user.managerId };

    const conversations = await Conversation.find(filter).sort({ updatedAt: -1 }).lean();

    const decorated = await Promise.all(
      conversations.map(async (c) => {
        // You already store these; use them for the customer’s list UI
        let partnerName = '';
        if (isCustomer) {
          partnerName = `${c.canteenName || 'Canteen'} • ${c.managerName || 'Manager'}`;
        } else {
          // Manager needs customer’s name (not in your conversation doc), fetch user:
          let customerName = 'Customer';
          try {
            const user = await User.findById(c.userId).select('firstName lastName').lean();
            if (user) customerName = `${user.firstName} ${user.lastName}`;
          } catch (_) {}
          partnerName = customerName;
        }

        // If you trust conversation.lastMessage, you can use it directly.
        // But to be safe we’ll fetch the last Message doc (matches your Message schema).
        const lastMsg = await Message.findOne({ conversationId: c._id })
          .sort({ createdAt: -1 })
          .lean();

        // Unread count: count messages from the *other* side where read === false
        const otherSenderType = isCustomer ? 'manager' : 'user';
        const unreadCount = await Message.countDocuments({
          conversationId: c._id,
          senderType: otherSenderType,
          read: false,       // <-- your schema uses "read", not "isRead"
        });

        return {
          _id: c._id,
          partnerName,
          lastMessage: lastMsg
            ? { text: lastMsg.text, createdAt: lastMsg.createdAt }
            : (c.lastMessage ? { text: c.lastMessage, createdAt: c.updatedAt } : null),
          unreadCount,
        };
      })
    );

    res.json({ conversations: decorated });
  } catch (err) {
    console.error('GET /api/chat/my-conversations error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/chat/conversations/:id/read', auth, async (req, res) => {
  try {
    const { id } = req.params; // conversationId
    const role = req.user?.role; // 'customer' or 'manager'
    if (!role) return res.status(401).json({ message: 'Unauthorized' });

    // which side is the viewer?
    const viewerSide = role === 'manager' ? 'manager' : 'user';
    const otherSide = viewerSide === 'manager' ? 'user' : 'manager';

    // 1) Mark all messages sent by the other side as read
    await Message.updateMany(
      { conversationId: id, senderType: otherSide, read: false },
      { $set: { read: true } }
    );

    // 2) Reset unread counter on the conversation doc
    const update =
      viewerSide === 'manager'
        ? { unreadForManager: 0 }
        : { unreadForUser: 0 };

    await Conversation.findByIdAndUpdate(id, { $set: update });

    return res.json({ ok: true });
  } catch (err) {
    console.error('POST /chat/conversations/:id/read error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
