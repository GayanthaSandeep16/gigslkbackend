const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/performers/new - get performers registered in last 10 days
router.get('/new', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM performers WHERE created_at >= DATE_SUB(NOW(), INTERVAL 10 DAY) ORDER BY created_at DESC LIMIT 4`
    );
    res.json({ profiles: rows });
  } catch (err) {
    console.error('Error fetching new performers:', err);
    res.status(500).json({ message: 'Failed to fetch new performers', error: err.message });
  }
});

module.exports = router;
