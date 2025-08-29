// models/ManagerInvite.js
const mongoose = require('mongoose');

const managerInviteSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, index: true },
  canteenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Canteen', required: true },
  expiresAt: { type: Date, required: true, index: true },
  usedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('ManagerInvite', managerInviteSchema);
