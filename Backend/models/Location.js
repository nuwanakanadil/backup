// models/Location.js
const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
});

// Create 2dsphere index for geospatial queries
LocationSchema.index({ coordinates: '2dsphere' });

// Export the model (CommonJS)
module.exports = mongoose.model('Location', LocationSchema);
