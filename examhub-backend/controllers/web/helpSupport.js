// controllers/helpSupport.js
const pool = require('../../config/db');
const { validationResult } = require('express-validator');

exports.getFaqs = async (req, res, next) => {
  try {
    const [faqs] = await pool.query(`
      SELECT faq_id, question, answer, category
      FROM faqs
    `);
    res.json(faqs);
  } catch (err) {
    next(new Error('Failed to fetch FAQs'));
  }
};

exports.getGuides = async (req, res, next) => {
  try {
    const [guides] = await pool.query(`
      SELECT guide_id, title, content, category
      FROM guides
    `);
    res.json(guides);
  } catch (err) {
    next(new Error('Failed to fetch guides'));
  }
};

exports.getVideos = async (req, res, next) => {
  try {
    const [videos] = await pool.query(`
      SELECT video_id, title, video_url, thumbnail_url
      FROM videos
    `);
    res.json(videos);
  } catch (err) {
    next(new Error('Failed to fetch videos'));
  }
};

exports.submitTicket = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { issue_type, description } = req.body;
    const userId = 1; // Assume admin user_id=1 for demo
    const [result] = await pool.query(
      `
      INSERT INTO support_tickets (user_id, issue_type, description)
      VALUES (?, ?, ?)
    `,
      [userId, issue_type, description]
    );
    res.status(201).json({
      ticket_id: result.insertId,
      issue_type,
      description,
      status: 'open',
    });
  } catch (err) {
    next(new Error('Failed to submit ticket'));
  }
};
