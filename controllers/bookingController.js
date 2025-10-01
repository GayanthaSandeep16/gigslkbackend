// Booking controller
const db = require('../config/db');
const path = require('path');
const { generateBookingReceipt } = require('./pdfUtil');

// Helper: resolve performer id from either performer.id or users.id
async function resolvePerformerId(idLike) {
  const idNum = parseInt(idLike);
  if (isNaN(idNum) || idNum <= 0) return null;
  const [byPerf] = await db.query('SELECT id FROM performers WHERE id = ? LIMIT 1', [idNum]);
  if (byPerf && byPerf.length) return byPerf[0].id;
  const [byUser] = await db.query('SELECT id FROM performers WHERE user_id = ? LIMIT 1', [idNum]);
  if (byUser && byUser.length) return byUser[0].id;
  return null;
}

// Generate and download a real PDF receipt
exports.getBookingReceipt = async (req, res) => {
  try {
    console.log('getBookingReceipt called');
    const bookingId = parseInt(req.params.id, 10);
    if (!bookingId || Number.isNaN(bookingId)) {
      return res.status(400).json({ message: 'Invalid booking id' });
    }

    // Fetch booking details
    const [bookingRows] = await db.query(
      'SELECT id, artist_id, host_id, event_date, event_time, event_location, notes, price, payment_method, created_at FROM bookings WHERE id = ? LIMIT 1',
      [bookingId]
    );
    if (!bookingRows || bookingRows.length === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    const booking = bookingRows[0];

    // Fetch host user (basic info)
    const [hostRows] = await db.query(
      'SELECT id, username, email FROM users WHERE id = ? LIMIT 1',
      [booking.host_id]
    );
    const hostUser = hostRows && hostRows[0] ? hostRows[0] : { username: 'Unknown', email: '-' };

    // Fetch artist performer + email
    const [artistRows] = await db.query(
      'SELECT p.stage_name, p.full_name, u.email FROM performers p JOIN users u ON u.id = p.user_id WHERE p.id = ? LIMIT 1',
      [booking.artist_id]
    );
    const artist = artistRows && artistRows[0] ? artistRows[0] : { stage_name: 'Unknown', full_name: 'Unknown', email: '-' };

    // Resolve logo path (optional)
    const logoPath = path.resolve(__dirname, '..', '..', 'Assets', 'gigs_logo.png');

    // Generate PDF buffer
    const pdfBuffer = await generateBookingReceipt({
      booking,
      host: { full_name: hostUser.username, username: hostUser.username, email: hostUser.email },
      artist,
      logoPath,
    });

    // Send as file download
    const filename = `gigs_receipt_${bookingId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(pdfBuffer));
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error('getBookingReceipt error:', err);
    return res.status(500).json({ message: 'Failed to generate receipt' });
  }
};

// Create a booking in DB and return its ID
exports.createBooking = async (req, res) => {
  try {
    console.log('createBooking called');
    const {
      artist_id,
      host_id,
      host_full_name,
      event_date,
      event_time,
      event_location,
      notes = '',
      price = 0,
      payment_method = ''
    } = req.body || {};

    if (!artist_id || !host_id || !event_date || !event_time || !event_location) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const performerId = await resolvePerformerId(artist_id);
    if (!performerId) {
      return res.status(404).json({ message: 'Artist not found.' });
    }

    const [result] = await db.execute(
      'INSERT INTO bookings (artist_id, host_id, event_date, event_time, event_location, notes, price, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [performerId, host_id, event_date, event_time, event_location, notes, price, payment_method]
    );
    const bookingId = result && (result.insertId || result.insertId === 0) ? result.insertId : undefined;

    // Optional: notify artist (best-effort)
    try {
      const [perfUserRows] = await db.query('SELECT user_id FROM performers WHERE id = ? LIMIT 1', [performerId]);
      const artistUserId = perfUserRows && perfUserRows[0] ? perfUserRows[0].user_id : null;
      if (artistUserId) {
        const notifText = `You have been booked by Host #${host_id} for ${event_location} on ${event_date} at ${event_time}.`;
        await db.execute(
          'INSERT INTO notifications (user_id, type, text, is_read) VALUES (?, ?, ?, 0)',
          [artistUserId, 'booking', notifText]
        );
      }
    } catch (e) {
      console.warn('Notification insert skipped:', e && e.message);
    }

    return res.status(201).json({ message: 'Booking created', bookingId });
  } catch (err) {
    console.error('createBooking error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Keep notifications simple for now
exports.getNotifications = async (req, res) => {
  try {
    console.log('getNotifications called');
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ message: 'Missing user_id' });
    // Best-effort: return empty list to avoid blocking frontend
    return res.json([]);
  } catch {
    return res.json([]);
  }
};

exports.getArtistMonthlyStats = async (req, res) => {
  console.log('getArtistMonthlyStats called');
  res.json({ stats: [] });
};
