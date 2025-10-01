// Host accepts a gig request: update status, send booking details to chat
exports.acceptGigRequest = async (req, res) => {
  const requestId = req.params.requestId;
  console.log('[acceptGigRequest] Called with requestId:', requestId);
  try {
    // 1. Update request status
    const updateResult = await db.query('UPDATE gig_requests SET status = ? WHERE id = ?', ['accepted', requestId]);
    console.log('[acceptGigRequest] gig_requests updated:', updateResult);
    // 2. Get gig/artist/host info
    const [rows] = await db.query(`
      SELECT gr.*, g.title, g.event_location, g.event_date, g.event_time, g.budget_min, g.budget_max, g.description, g.host_id, gr.performer_id,
        g.event_type, g.event_scope, g.location_city, g.location_district, g.talents
      FROM gig_requests gr
      JOIN gigs g ON gr.gig_id = g.id
      WHERE gr.id = ?
    `, [requestId]);
    console.log('[acceptGigRequest] gig/artist/host info:', rows);
    if (!rows.length) {
      console.log('[acceptGigRequest] No gig request found for id:', requestId);
      return res.status(404).json({ message: 'Gig request not found.' });
    }
    const reqData = rows[0];
    // 3b. Get performer and host user_id
    const [performerUserRows] = await db.query('SELECT user_id FROM performers WHERE id = ?', [reqData.performer_id]);
    if (!performerUserRows.length) {
      console.error('[acceptGigRequest] Performer user_id not found for performer_id:', reqData.performer_id);
      return res.status(500).json({ message: 'Performer user_id not found.' });
    }
    const performerUserId = performerUserRows[0].user_id;
    const [hostUserRows] = await db.query('SELECT user_id FROM hosts WHERE id = ?', [reqData.host_id]);
    if (!hostUserRows.length) {
      console.error('[acceptGigRequest] Host user_id not found for host_id:', reqData.host_id);
      return res.status(500).json({ message: 'Host user_id not found.' });
    }
    const hostUserId = hostUserRows[0].user_id;
    // 3. Compose chat message (after user IDs are defined)
    const message = `Booking Confirmed!\nEvent: ${reqData.title}\nDate: ${reqData.event_date} ${reqData.event_time ? 'at ' + reqData.event_time : ''}\nVenue: ${reqData.event_location}\nBudget: Rs. ${reqData.budget_min} - ${reqData.budget_max}\nDetails: ${reqData.description}`;
    // 4. Insert booking confirmation into messages table for both directions
    const msg1 = await db.query('INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)', [hostUserId, performerUserId, message]);
    const msg2 = await db.query('INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)', [performerUserId, hostUserId, message]);
    console.log('[acceptGigRequest] messages inserted:', msg1, msg2);
    // 5. Notify artist
    const notif = await db.query('INSERT INTO notifications (user_id, type, text, is_read) VALUES (?, ?, ?, 0)', [performerUserId, 'booking', 'Your request was accepted! See chat for booking details.']);
    console.log('[acceptGigRequest] notification inserted:', notif);
    res.json({ success: true, message: 'Request accepted, chat and notification sent.' });
  } catch (err) {
    console.error('[acceptGigRequest] Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
}
// backend/controllers/gigRequestController.js
const db = require('../config/db');

// Artist requests to join a gig
exports.requestGig = async (req, res) => {
  try {
    const { gigId } = req.params;
    const artistId = req.user.id;
    // Find gig and host
    const [gigRows] = await db.query('SELECT * FROM gigs WHERE id = ?', [gigId]);
    if (!gigRows.length) return res.status(404).json({ message: 'Gig not found' });
  const gig = gigRows[0];
  // Find performer internal ID from user ID
  const [performerRows] = await db.query('SELECT id FROM performers WHERE user_id = ?', [artistId]);
  if (!performerRows.length) return res.status(404).json({ message: 'Performer not found' });
  const performerId = performerRows[0].id;
  // Insert request using performerId and get the inserted request's ID
  const [result] = await db.query('INSERT INTO gig_requests (gig_id, performer_id, status) VALUES (?, ?, ?)', [gigId, performerId, 'pending']);
  const requestId = result.insertId;
  // Notify host
  const [hostRows] = await db.query('SELECT user_id FROM hosts WHERE id = ?', [gig.host_id]);
  if (!hostRows.length) return res.status(404).json({ message: 'Host not found' });
  const hostUserId = hostRows[0].user_id;
  // Get artist username
  const [artistRows] = await db.query('SELECT username FROM users WHERE id = ?', [artistId]);
  const artistName = artistRows.length ? artistRows[0].username : `Artist #${artistId}`;
  const notifText = `${artistName} requested to join your gig '${gig.title}'. Accept or reject?`;
  await db.query('INSERT INTO notifications (user_id, type, text, is_read, request_id) VALUES (?, ?, ?, 0, ?)', [hostUserId, 'gig_request', notifText, requestId]);
  // Insert gig request message into messages table for host's chat
  await db.query('INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)', [artistId, hostUserId, notifText]);
  res.status(201).json({ message: 'Request sent and host notified.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Host responds to request
exports.respondToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { response } = req.body; // 'accepted' or 'rejected'
    // Update request status
    const [result] = await db.query('UPDATE gig_requests SET status = ? WHERE id = ?', [response, requestId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Request not found' });
    // Get artist_id, gig_id
    const [reqRows] = await db.query('SELECT artist_id, gig_id FROM gig_requests WHERE id = ?', [requestId]);
    if (!reqRows.length) return res.status(404).json({ message: 'Request not found' });
    const { artist_id, gig_id } = reqRows[0];
    // Get gig and host
    const [gigRows] = await db.query('SELECT title, host_id FROM gigs WHERE id = ?', [gig_id]);
    if (!gigRows.length) return res.status(404).json({ message: 'Gig not found' });
    const gig = gigRows[0];
    // Notify artist if accepted
    if (response === 'accepted') {
      const notifText = `Host confirmed you for the gig '${gig.title}'.`;
      await db.query('INSERT INTO notifications (user_id, type, text, is_read) VALUES (?, ?, ?, 0)', [artist_id, 'gig_request', notifText]);
    }
    res.json({ message: 'Response recorded.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
