const db = require('../config/db');

// Get all reviews (host and performer)
exports.getAllReviews = async (req, res) => {
  try {
    // You can join with users and performers for more info
    const [reviews] = await db.query(`
      SELECT ar.id, ar.reviewer_id, ar.reviewer_role, ar.artist_id AS target_id, ar.rating, ar.review_text AS comment, ar.created_at,
        u.username AS reviewer_name, p.stage_name AS target_name
      FROM artist_reviews ar
      LEFT JOIN users u ON ar.reviewer_id = u.id
      LEFT JOIN performers p ON ar.artist_id = p.id
      ORDER BY ar.created_at DESC
    `);
    res.json({ reviews });
  } catch (err) {
    console.error('Error fetching all reviews:', err);
    res.status(500).json({ message: 'Failed to fetch reviews', error: err.message });
  }
};

// Delete any review by ID
exports.deleteReview = async (req, res) => {
  try {
    const { review_id } = req.params;
    const [rows] = await db.query('SELECT * FROM artist_reviews WHERE id = ?', [review_id]);
    if (!rows.length) return res.status(404).json({ message: 'Review not found.' });
    await db.query('DELETE FROM artist_reviews WHERE id = ?', [review_id]);
    res.json({ message: 'Review deleted.' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ message: 'Failed to delete review', error: err.message });
  }
};
