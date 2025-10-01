const db = require('../config/db');

// Helper: resolve a performer id from either a performers.id or a users.id
async function resolvePerformerId(idLike) {
  const idNum = parseInt(idLike);
  if (isNaN(idNum) || idNum <= 0) return null;

  // First try direct performers.id
  const [byPerformerId] = await db.query('SELECT id FROM performers WHERE id = ?', [idNum]);
  if (byPerformerId && byPerformerId.length) {
    return byPerformerId[0].id;
  }

  // Fallback: treat provided id as users.id
  const [byUserId] = await db.query('SELECT id FROM performers WHERE user_id = ?', [idNum]);
  if (byUserId && byUserId.length) {
    return byUserId[0].id;
  }

  return null;
}

// Add a review for an artist
exports.addReview = async (req, res) => {
  console.log('=== addReview called ===');
  console.log('Params:', req.params);
  console.log('Body:', req.body);
  
  try {
    const { artist_id } = req.params;
    const { reviewer_id, reviewer_role, rating, review_text, booking_id } = req.body;

    // Resolve performer id from either performer.id or user.id
    const performerId = await resolvePerformerId(artist_id);
    if (!performerId) {
      return res.status(404).json({ message: 'Artist not found.' });
    }

    // Only allow hosts or artists/performers to review artists
    if (!['host', 'artist', 'performer'].includes(reviewer_role)) {
      return res.status(403).json({ message: 'Only hosts or artists can review artists.' });
    }

    // Only allow reviews for resolved performer id
    // (performer existence already ensured by resolvePerformerId)

    // If reviewer is a host, validate booking with this artist.
    // Requirement: allow review right after receipt download → accept a specific booking_id for validation (no past-date requirement).
    if (reviewer_role === 'host') {
      if (booking_id) {
        const [rowsById] = await db.query(
          'SELECT id FROM bookings WHERE id = ? AND host_id = ? AND artist_id = ? LIMIT 1',
          [parseInt(booking_id), reviewer_id, performerId]
        );
        if (!rowsById.length) {
          return res.status(403).json({ message: 'Invalid booking reference for this review.' });
        }
      } else {
        // Fallback: any booking between this host and artist (no date restriction to support immediate review flow)
        const [anyBooking] = await db.query(
          'SELECT id FROM bookings WHERE host_id = ? AND artist_id = ? LIMIT 1',
          [reviewer_id, performerId]
        );
        if (!anyBooking.length) {
          return res.status(403).json({ message: 'You must have a booking with this artist to review.' });
        }
      }
    }

    await db.query(
      'INSERT INTO artist_reviews (artist_id, reviewer_id, reviewer_role, rating, review_text) VALUES (?, ?, ?, ?, ?)',
      [performerId, reviewer_id, reviewer_role, rating, review_text]
    );

    // Recalculate average rating and total reviews for the artist
    const [rows] = await db.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total_reviews FROM artist_reviews WHERE artist_id = ?',
      [performerId]
    );
    const avgRating = rows[0].avg_rating || 0;
    const totalReviews = rows[0].total_reviews || 0;

    // Update performers table
    await db.query(
      'UPDATE performers SET average_rating = ?, total_reviews = ? WHERE id = ?',
      [avgRating, totalReviews, performerId]
    );

  console.log('Review inserted for performer', performerId, 'by', reviewer_id, 'role', reviewer_role);
  return res.status(201).json({ message: 'Review added and rating updated.' });
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all reviews for an artist
exports.getReviews = async (req, res) => {
  try {
    const { artist_id } = req.params;
    // For reading, accept either performer.id or user.id; resolve if possible, else use raw id for backward-compat
    const resolved = await resolvePerformerId(artist_id);
    const targetId = resolved || parseInt(artist_id) || 0;
    const [reviews] = await db.query(
      'SELECT ar.*, u.username AS reviewer_name FROM artist_reviews ar JOIN users u ON ar.reviewer_id = u.id WHERE ar.artist_id = ? ORDER BY ar.created_at DESC',
      [targetId]
    );
    res.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if a host can review an artist (has completed bookings)
exports.canReviewArtist = async (req, res) => {
  try {
    const { artist_id } = req.params;
    const { host_id } = req.query;

    if (!host_id) {
      return res.status(400).json({ message: 'Host ID is required.' });
    }
    // Resolve performer id
    const performerId = await resolvePerformerId(artist_id);
    if (!performerId) {
      console.warn('canReviewArtist: could not resolve performer from artist_id:', artist_id);
      // Be tolerant for UI: return canReview false instead of 404 to avoid noisy errors
      return res.json({ canReview: false, completedBookings: 0, message: 'Artist not found.' });
    }

    // Check if host has completed bookings with this artist
    const [bookingRows] = await db.query(
      'SELECT id, event_date FROM bookings WHERE host_id = ? AND artist_id = ? AND event_date < CURDATE()',
      [host_id, performerId]
    );

    const canReview = bookingRows.length > 0;
    res.json({ 
      canReview,
      completedBookings: bookingRows.length,
      message: canReview ? 'Host can review this artist.' : 'Host must complete a booking before reviewing this artist.'
    });
  } catch (error) {
    console.error('Error checking review permission:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
