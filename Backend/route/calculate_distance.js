// routes/location.js
const express = require('express');
const router = express.Router();
const Location = require('../models/Location');

// Haversine Distance Function
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371; // Radius of Earth in KM

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST route to calculate distance
router.post('/calculate-distance', async (req, res) => {
  const { latitude, longitude } = req.body;

  try {
    const savedPlace = await Location.findOne({ name: 'Canteen A' });

    if (!savedPlace)
      return res.status(404).json({ message: 'Saved location not found' });

    const [savedLon, savedLat] = savedPlace.coordinates.coordinates;

    const distance = haversineDistance(latitude, longitude, savedLat, savedLon);

    console.log('Distance (km):', distance.toFixed(2));

    return res.status(200).json({ distance: distance.toFixed(2) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error calculating distance' });
  }
});

module.exports = router;
