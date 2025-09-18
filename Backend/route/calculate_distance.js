const express = require('express');
const router = express.Router();
const Canteen = require('../models/Canteen');

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

// POST route to calculate distance to the nearest canteen
router.post('/calculate-distance', async (req, res) => {
  const { latitude, longitude } = req.body;

  try {
    // Find all canteens
    const canteens = await Canteen.find();

    if (canteens.length === 0) {
      return res.status(404).json({ message: 'No canteens found' });
    }

    // Calculate distances to all canteens
    const distances = await Promise.all(
      canteens.map(async (canteen) => {
        const [lon, lat] = canteen.location.coordinates;

        const distance = haversineDistance(latitude, longitude, lat, lon);

        return {
          canteenId: canteen._id,
          name: canteen.name,
          distance,
        };
      })
    );

    // Sort canteens by distance (ascending)
    distances.sort((a, b) => a.distance - b.distance);

    return res.status(200).json({ distances });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error calculating distances' });
  }
});

module.exports = router;
