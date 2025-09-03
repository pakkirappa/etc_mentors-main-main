const pool = require('../../config/db');
const s3 = require("../../services/storage");
const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });

exports.uploadResource = [
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const fileName = `${Date.now()}-${file.originalname}`;
      const params = {
        Bucket: "ymts",
        Key: fileName,
        Body: file.buffer,
        ACL: "public-read",
        ContentType: file.mimetype
      };

      const data = await s3.upload(params).promise();
      res.json({ url: data.Location });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
];

function getUserIdFromToken(user) {
  if (!user) return null;

  let cand =
    user.user_id ??         
    user.id ??              
    user.sub ??            
    user.userId ??        
    user.uid ??             
    user.userKey ??         
    null;

  if (cand == null) return null;

  if (typeof cand === 'string' && /^\d+$/.test(cand)) return Number(cand);

  return cand;
}

// GET /api/previous-questions  (unchanged)
exports.list = async (req, res, next) => {
  try {
    const {
      course, subject_mode, startDate, endDate, uploaded_by, q,
      page = 1, pageSize = 10
    } = req.query;

    const conds = [];
    const params = [];

    if (course)       { conds.push('pqs.course = ?'); params.push(course); }
    if (subject_mode) { conds.push('pqs.subject_mode = ?'); params.push(subject_mode); }
    if (uploaded_by)  { conds.push('pqs.uploaded_by = ?'); params.push(uploaded_by); }
    if (startDate)    { conds.push('pqs.exam_conducted_on >= ?'); params.push(startDate); }
    if (endDate)      { conds.push('pqs.exam_conducted_on <= ?'); params.push(endDate); }
    if (q)            { conds.push('(pqs.notes LIKE ? OR pqs.resource_url LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const limit = Math.max(1, Math.min(100, Number(pageSize)));
    const offset = (Math.max(1, Number(page)) - 1) * limit;

    const sql = `
      SELECT pqs.*, u.username AS uploader_username, u.full_name AS uploader_name
      FROM previous_question_sets pqs
      JOIN users u ON u.user_id = pqs.uploaded_by
      ${where}
      ORDER BY pqs.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(sql, [...params, limit, offset]);

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM previous_question_sets pqs ${where}`,
      params
    );

    res.json({ data: rows, page: Number(page), pageSize: limit, total });
  } catch (err) {
    next(new Error(`Failed to list previous question sets: ${err.message}`));
  }
};

// POST /api/previous-questions
exports.create = async (req, res, next) => {
  try {
    const uploader = getUserIdFromToken(req.user);
    if (uploader == null) {
      return res.status(401).json({ message: 'Unauthenticated: user id not present in token' });
    }

    const {
      course,
      subject_mode,             
      subjects,                  
      exam_conducted_on,
      resource_url,
      notes
    } = req.body;

    // Basic validation
    if (!course || !subject_mode || !Array.isArray(subjects) || !subjects.length || !resource_url) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Enforce single vs multiple on backend too (defensive)
    const trimmed = subjects.map(s => ({ ...s, name: String(s.name || '').trim() })).filter(s => s.name);
    if (subject_mode === 'single') {
      if (trimmed.length !== 1) {
        return res.status(400).json({ message: 'Single subject mode requires exactly one subject name.' });
      }
    } else if (subject_mode === 'multiple') {
      if (trimmed.length < 2) {
        return res.status(400).json({ message: 'Multiple subject mode requires at least two subject names.' });
      }
    }

    const sql = `
      INSERT INTO previous_question_sets
      (course, subject_mode, subjects_json, exam_conducted_on, resource_url, notes, uploaded_by)
      VALUES (?, ?, CAST(? AS JSON), ?, ?, ?, ?)
    `;
    const params = [
      course,
      subject_mode,
      JSON.stringify(trimmed),
      exam_conducted_on || null,
      resource_url,
      notes || null,
      uploader
    ];

    const [result] = await pool.query(sql, params);
    const [[row]] = await pool.query(`SELECT * FROM previous_question_sets WHERE pqs_id = ?`, [result.insertId]);
    res.status(201).json(row);
  } catch (err) {
    next(new Error(`Failed to create previous question set: ${err.message}`));
  }
};

// DELETE /api/previous-questions/:id
exports.remove = async (req, res, next) => {
  try {
    const uploader = getUserIdFromToken(req.user);
    if (uploader == null) {
      return res.status(401).json({ message: 'Unauthenticated: user id not present in token' });
    }

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    // Ensure the record exists and is owned by the requester
    const [rows] = await pool.query(
      'SELECT pqs_id, uploaded_by FROM previous_question_sets WHERE pqs_id = ?',
      [id]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'Record not found' });
    }
    const row = rows[0];

    if (row.uploaded_by !== uploader) {
      // If you later add roles, allow admins here
      return res.status(403).json({ message: 'You are not allowed to delete this record' });
    }

    // Hard delete (no soft-delete column in current schema)
    await pool.query('DELETE FROM previous_question_sets WHERE pqs_id = ?', [id]);

    return res.status(200).json({ message: 'Deleted', pqs_id: id });
  } catch (err) {
    next(new Error(`Failed to delete previous question set: ${err.message}`));
  }
};
