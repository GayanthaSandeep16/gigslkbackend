const db = require('../config/db');

exports.getAvailableUsers = async (req, res) => {
  const userRole = req.user.role;
  if (userRole === 'host') {
    const [rows] = await db.query(`
      SELECT performers.id, users.id AS user_id, users.username, performers.stage_name, performers.location, users.profile_picture_url
      FROM performers
      JOIN users ON performers.user_id = users.id
    `);
    res.json(rows);
  } else if (userRole === 'performer') {
    const [rows] = await db.query(`
      SELECT hosts.id, users.id AS user_id, users.username, hosts.company_organization, hosts.location, users.profile_picture_url
      FROM hosts
      JOIN users ON hosts.user_id = users.id
    `);
    res.json(rows);
  } else {
    res.status(400).json({ message: 'Invalid role' });
  }
};

exports.sendMessage = async (req, res) => {
  const { receiver_id, message_text } = req.body;
  const sender_id = req.user.id;
  await db.query(
    'INSERT INTO messages (sender_id, receiver_id, message_text) VALUES (?, ?, ?)',
    [sender_id, receiver_id, message_text]
  );
  res.json({ message: 'Message sent' });
};

exports.getChatHistory = async (req, res) => {
  const user_id = req.user.id;
  const { other_id } = req.params;
  const [rows] = await db.query(
    `SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?) ORDER BY sent_at ASC`,
    [user_id, other_id, other_id, user_id]
  );
  res.json(rows);
};
