const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
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
  sellerId: {
    type: String,
    required: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);