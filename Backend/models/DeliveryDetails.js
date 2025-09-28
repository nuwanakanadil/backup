const mongoose = require('mongoose');

const DeliveryDetailsSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true, unique: true },
    deliveryPersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryPerson', required: true, index: true },
    assignedAt: { type: Date, default: Date.now, index: true },
    deliveredAt: { type: Date, default: null },
    rating: { type: Number, min: 0, max: 5, default: null },
    ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DeliveryDetails', DeliveryDetailsSchema);
