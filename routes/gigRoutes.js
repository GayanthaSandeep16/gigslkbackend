// gigRoutes.js

const express = require('express');
const router = express.Router();
const gigController = require('../controllers/gigController');
const auth = require('../middleware/authMiddleware');

// Route to get all gigs (public - for browsing)
router.get('/', gigController.getAllGigs);

// Route to post a new gig (authenticated - only for hosts)
router.post('/post', auth, gigController.postGig);
router.get('/:id', gigController.getGigById);
// Route to delete a gig by ID (authenticated)
router.delete('/:id', gigController.deleteGig);

module.exports = router;