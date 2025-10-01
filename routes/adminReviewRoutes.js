const express = require('express');
const router = express.Router();
const adminReviewController = require('../controllers/adminReviewController');

// GET /api/admin/reviews - fetch all reviews
router.get('/reviews', adminReviewController.getAllReviews);

// DELETE /api/admin/reviews/:review_id - delete any review
router.delete('/reviews/:review_id', adminReviewController.deleteReview);

module.exports = router;
