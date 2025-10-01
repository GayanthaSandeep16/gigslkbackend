
// backend/routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// GET /api/bookings/:id/receipt - download PDF receipt for a booking
router.get('/:id/receipt', bookingController.getBookingReceipt);

// POST /api/bookings - create booking and notify artist
router.post('/', bookingController.createBooking);


// GET /api/bookings/artist-monthly-stats?artist_id= - get monthly stats for artist
router.get('/artist-monthly-stats', bookingController.getArtistMonthlyStats);

// GET /api/bookings/notifications?user_id= - get notifications for user
router.get('/notifications', bookingController.getNotifications);

module.exports = router;
