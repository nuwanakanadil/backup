// models/Canteen.js
const mongoose = require('mongoose');

const canteenSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // GeoJSON Point: coordinates = [lng, lat]
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        validate: {
          validator: (v) => Array.isArray(v) && v.length === 2,
          message: 'location.coordinates must be [lng, lat]',
        },
      },
    },

    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Manager',
      required: true,
      index: true,
      unique: true, // one canteen per manager (change if you want multiple)
    },
  },
  { timestamps: true }
);

// Geospatial index
canteenSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Canteen', canteenSchema);
