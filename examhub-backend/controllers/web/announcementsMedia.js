// controllers/announcementsMedia.js
const pool = require('../../config/db');
const { validationResult } = require('express-validator');
const { URL } = require('url');
const s3 = require("../../services/storage");
const multer = require("multer");
const path = require("path");

const upload = multer({ storage: multer.memoryStorage() });

exports.uploadFile = [
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const fileName = `${Date.now()}-${file.originalname}`;
      const params = {
        Bucket: "ymts",
        Key: fileName,
        Body: file.buffer,
        ACL: "public-read", // so the file is accessible via URL
        ContentType: file.mimetype
      };

      const data = await s3.upload(params).promise();
      res.json({ url: data.Location }); // return public URL to frontend
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
];

function normalizeGoogleRedirect(u) {
  try {
    const parsed = new URL(u);
    if (parsed.hostname.includes('google.') && parsed.pathname === '/url') {
      const inner = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (inner) return decodeURIComponent(inner);
    }
  } catch (_) {}
  return u;
}

function isHttpUrl(u) {
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isLikelyImage(u) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(u);
}
function isLikelyVideo(u) {
  if (/\.(mp4|webm|ogg)$/i.test(u)) return true;
  // whitelisted video hosts (extend as needed)
  try {
    const { hostname } = new URL(u);
    return /(youtube\.com|youtu\.be|vimeo\.com)$/i.test(hostname);
  } catch { return false; }
}

exports.getAnnouncements = async (req, res, next) => {
  try {
    const [announcements] = await pool.query(`SELECT * FROM announcements`);
    res.json(announcements);
  } catch (err) {
    next(new Error('Failed to fetch announcements'));
  }
};

exports.createAnnouncement = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    let {
      title, content, announcement_type, media_url, video_url,
      priority, target_audience, status, created_at, expires_at
    } = req.body;

    // Normalize & validate URLs
    media_url = media_url ? normalizeGoogleRedirect(media_url) : null;
    video_url = video_url ? normalizeGoogleRedirect(video_url) : null;

    if (media_url && (!isHttpUrl(media_url) || !(isLikelyImage(media_url)))) {
      return res.status(400).json({ error: 'media_url must be a direct image URL (png/jpg/gif/webp/svg).' });
    }
    if (video_url && (!isHttpUrl(video_url) || !(isLikelyVideo(video_url)))) {
      return res.status(400).json({ error: 'video_url must be a direct video file or a supported host (YouTube/Vimeo).' });
    }

    const userId = 1; // admin
    const [result] = await pool.query(
      `INSERT INTO announcements
       (title, content, announcement_type, media_url, video_url, priority, target_audience, status, views, created_at, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        title, content, announcement_type,
        media_url || null, video_url || null,
        priority, target_audience, status,
        created_at, expires_at || null, userId
      ]
    );

    res.status(201).json({ announcement_id: result.insertId, ...req.body, media_url, video_url });
  } catch (err) {
    next(new Error('Failed to create announcement'));
  }
};

exports.updateAnnouncement = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { id } = req.params;
    let {
      title, content, announcement_type, media_url, video_url,
      priority, target_audience, status, created_at, expires_at
    } = req.body;

    media_url = media_url ? normalizeGoogleRedirect(media_url) : null;
    video_url = video_url ? normalizeGoogleRedirect(video_url) : null;

    if (media_url && (!isHttpUrl(media_url) || !(isLikelyImage(media_url)))) {
      return res.status(400).json({ error: 'media_url must be a direct image URL (png/jpg/gif/webp/svg).' });
    }
    if (video_url && (!isHttpUrl(video_url) || !(isLikelyVideo(video_url)))) {
      return res.status(400).json({ error: 'video_url must be a direct video file or a supported host (YouTube/Vimeo).' });
    }

    await pool.query(
      `UPDATE announcements
       SET title=?, content=?, announcement_type=?, media_url=?, video_url=?, priority=?, target_audience=?, status=?, created_at=?, expires_at=?
       WHERE announcement_id=?`,
      [
        title, content, announcement_type,
        media_url || null, video_url || null,
        priority, target_audience, status,
        created_at, expires_at || null, id
      ]
    );

    res.json({ message: 'Announcement updated' });
  } catch (err) {
    next(new Error('Failed to update announcement'));
  }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM announcements WHERE announcement_id = ?`, [id]);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    next(new Error('Failed to delete announcement'));
  }
};
