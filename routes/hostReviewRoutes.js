const express = require('express');
const router = express.Router();
const hostReviewController = require('../controllers/hostReviewController');

// GET /api/hosts/:host_id/reviews - all reviews posted by this host
router.get('/:host_id/reviews', hostReviewController.getHostReviews);

// PUT /api/hosts/:host_id/reviews/:review_id - update a review
router.put('/:host_id/reviews/:review_id', hostReviewController.updateHostReview);

// DELETE /api/hosts/:host_id/reviews/:review_id - delete a review
router.delete('/:host_id/reviews/:review_id', hostReviewController.deleteHostReview);

module.exports = router;
