const mongoose = require('mongoose');

const DeliveryPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rating: { type: Number, min: 0, max: 5, default: 0 }, // average rating
    status: { type: String, enum: ['active', 'inactive'], default: 'inactive', index: true },

    // Helpful (optional) fields for tie-breaking / analytics
    lastAssignedAt: { type: Date, default: null },
    totalAssigned: { type: Number, default: 0 },
    totalRatingsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryPerson', DeliveryPersonSchema);
