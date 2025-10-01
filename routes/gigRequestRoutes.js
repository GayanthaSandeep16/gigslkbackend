
const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const gigRequestController = require('../controllers/gigRequestController');

// Host accepts a gig request
router.post('/:requestId/accept', auth, gigRequestController.acceptGigRequest);

// Test route to verify router is active
router.get('/test', (req, res) => {
	res.json({ message: 'gigRequestRoutes is active' });
});

// Artist requests to join a gig
router.post('/:gigId/request', auth, gigRequestController.requestGig);
// Host responds to request
router.post('/request/:requestId/respond', auth, gigRequestController.respondToRequest);

module.exports = router;
