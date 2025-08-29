const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  canteenId: { type: mongoose.Schema.Types.ObjectId,
     ref: 'Canteen', 
     required: true,
     index: true
  },
  name: {
    type: String,
    required: true,
  },
  image: String,
  description: String,
  price: {
    type: Number,
    required: true,
  },
  sellerId: { type: mongoose.Schema.Types.ObjectId,
    ref: 'Manager',
    required: true,
    index: true
  }

}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);