const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

router.get('/:productId', async (req, res) => {
  const { productId } = req.params;
  try {
    const reviews = await Review.find({ productId }).sort({ createdAt: -1 }).limit(10);

    // Calculate average rating
    const allReviews = await Review.find({ productId });
    const total = allReviews.length;
    const avg = total === 0 ? 0 : allReviews.reduce((sum, r) => sum + r.rating, 0) / total;

    // Distribution
    const dist = {
      excellent: allReviews.filter(r => r.rating === 5).length / total * 100,
      good: allReviews.filter(r => r.rating === 4).length / total * 100,
      average: allReviews.filter(r => r.rating === 3).length / total * 100,
      below_average: allReviews.filter(r => r.rating === 2).length / total * 100,
      poor: allReviews.filter(r => r.rating === 1).length / total * 100
    };

    res.json({ reviews, averageRating: Math.round(avg), distribution: dist });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.post('/addNewReview', async (req, res) => {
  const { productId, name, comment, rating } = req.body;
  try {
    const review = new Review({ productId, name, comment, rating });
    await review.save();
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: 'Failed to post review' });
  }
});

module.exports = router;
