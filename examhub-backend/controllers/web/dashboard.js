// controllers/dashboard.js
const pool = require('../../config/db');

// GET /api/dashboard/stats
// Returns: { total_students, total_exams, avg_score, completion_rate }
exports.getStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateConds = [];
    const dateParams = [];
    if (startDate) {
      dateConds.push('e.start_date >= ?');
      dateParams.push(startDate);
    }
    if (endDate) {
      dateConds.push('e.start_date <= ?');
      dateParams.push(endDate);
    }

    const examsWhere = dateConds.length
      ? `WHERE ${dateConds.join(' AND ')}`
      : '';
    const examsAnd = dateConds.length ? ` AND ${dateConds.join(' AND ')}` : '';

    const params = [
      ...dateParams, // for total_exams
      ...dateParams, // for avg_score
      ...dateParams, // for completion_rate
    ];

    const sql = `
      SELECT
        /* total students having role=student (not date-filtered) */
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,

        /* total exams within date range */
        (SELECT COUNT(*) FROM exams e ${examsWhere}) AS total_exams,

        /* average percentage across completed attempts, filtered by exam date */
        (
          SELECT ROUND(AVG(se.percentage), 1)
          FROM student_exams se
          JOIN exams e ON e.exam_id = se.exam_id
          WHERE se.status = 'completed' AND se.percentage IS NOT NULL
          ${examsAnd}
        ) AS avg_score,

        /* completion rate across attempts, filtered by exam date */
        (
          SELECT ROUND(
            (SUM(CASE WHEN se.status = 'completed' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0)) * 100
          , 1)
          FROM student_exams se
          JOIN exams e ON e.exam_id = se.exam_id
          WHERE se.status IN ('registered','in_progress','completed','absent')
          ${examsAnd}
        ) AS completion_rate
    `;

    const [[stats]] = await pool.query(sql, params);

    const payload = {
      total_students: Number(stats.total_students) || 0,
      total_exams: Number(stats.total_exams) || 0,
      avg_score: stats.avg_score === null ? 0 : Number(stats.avg_score),
      completion_rate:
        stats.completion_rate === null ? 0 : Number(stats.completion_rate),
    };

    res.json(payload);
  } catch (err) {
    next(new Error(`Failed to fetch dashboard stats: ${err.message}`));
  }
};

// GET /api/dashboard/recent-exams
exports.getRecentExams = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateConds = [];
    const dateParams = [];
    if (startDate) {
      dateConds.push('e.start_date >= ?');
      dateParams.push(startDate);
    }
    if (endDate) {
      dateConds.push('e.start_date <= ?');
      dateParams.push(endDate);
    }

    const whereClause = dateConds.length
      ? `WHERE ${dateConds.join(' AND ')}`
      : '';

    const sql = `
      SELECT
        e.exam_id,
        e.title,
        e.exam_type,
        e.start_date,
        e.status,
        COUNT(se.student_exam_id) AS participants
      FROM exams e
      LEFT JOIN student_exams se ON se.exam_id = e.exam_id
      ${whereClause}
      GROUP BY e.exam_id, e.title, e.exam_type, e.start_date, e.status
      ORDER BY e.start_date DESC
      LIMIT 4
    `;

    const [rows] = await pool.query(sql, dateParams);
    res.json(rows);
  } catch (err) {
    next(new Error(`Failed to fetch recent exams: ${err.message}`));
  }
};
