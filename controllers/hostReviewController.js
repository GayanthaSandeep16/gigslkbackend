// Update a review posted by a host
exports.updateHostReview = async (req, res) => {
  const { host_id, review_id } = req.params;
  const { rating, comment } = req.body;
  // Only allow update if the review belongs to the host
  const [rows] = await db.query('SELECT * FROM artist_reviews WHERE id = ? AND reviewer_id = ? AND reviewer_role = "host"', [review_id, host_id]);
  if (!rows.length) return res.status(404).json({ message: 'Review not found or not owned by host.' });
  await db.query('UPDATE artist_reviews SET rating = ?, review_text = ?, updated_at = NOW() WHERE id = ?', [rating, comment, review_id]);
  res.json({ message: 'Review updated.' });
};

// Delete a review posted by a host
exports.deleteHostReview = async (req, res) => {
  const { host_id, review_id } = req.params;
  // Only allow delete if the review belongs to the host
  const [rows] = await db.query('SELECT * FROM artist_reviews WHERE id = ? AND reviewer_id = ? AND reviewer_role = "host"', [review_id, host_id]);
  if (!rows.length) return res.status(404).json({ message: 'Review not found or not owned by host.' });
  await db.query('DELETE FROM artist_reviews WHERE id = ?', [review_id]);
  res.json({ message: 'Review deleted.' });
};
const db = require('../config/db');

// Get all reviews posted by a host
exports.getHostReviews = async (req, res) => {
  const { host_id } = req.params;
  // Find all reviews where reviewer_id = host_id and reviewer_role = 'host'
  const [reviews] = await db.query(
    `SELECT ar.*, u.username AS reviewer_name, p.stage_name AS artist_name, p.profile_picture_url AS artist_avatar
     FROM artist_reviews ar
     JOIN users u ON ar.reviewer_id = u.id
     JOIN performers p ON ar.artist_id = p.id
     WHERE ar.reviewer_id = ? AND ar.reviewer_role = 'host'
     ORDER BY ar.created_at DESC`,
    [host_id]
  );
  res.json({ reviews });
};
