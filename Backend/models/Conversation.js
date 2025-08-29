const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true, index: true },
    canteenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen', required: true, index: true },

    // for quick display
    canteenName: String,
    managerName: String,

    // unread counters for future
    unreadForManager: { type: Number, default: 0 },
    unreadForUser: { type: Number, default: 0 },

    lastMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Conversation', conversationSchema);
