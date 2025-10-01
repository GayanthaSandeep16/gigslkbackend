const express = require('express');
const router = express.Router();
const artistReviewController = require('../controllers/artistReviewController');

console.log('Artist review routes file loaded');
console.log('artistReviewController:', artistReviewController);

// Router-level debug logger
router.use((req, res, next) => {
  console.log(`[artistReviewRoutes] ${req.method} ${req.originalUrl} path=${req.path}`);
  next();
});

router.post('/:artist_id/reviews', artistReviewController.addReview);
router.get('/:artist_id/reviews', artistReviewController.getReviews);
router.get('/:artist_id/can-review', artistReviewController.canReviewArtist);

// Add a test route
router.get('/test', (req, res) => {
  res.json({ message: 'Artist review routes are working!' });
});

console.log('Artist review routes configured');

module.exports = router;
