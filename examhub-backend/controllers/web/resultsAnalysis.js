// controllers/resultsAnalysis.js
const pool = require('../../config/db');

// Always produce a subject value
const SUBJECT_FALLBACK_SQL = `
  CASE
    WHEN COUNT(es.subject) > 0 
      THEN GROUP_CONCAT(DISTINCT es.subject ORDER BY es.subject ASC)
    WHEN e.exam_format = 'single' THEN
      CASE
        WHEN e.title LIKE '%Physics%' THEN 'Physics'
        WHEN e.title LIKE '%Chemistry%' THEN 'Chemistry'
        WHEN e.title LIKE '%Biology%' THEN 'Biology'
        WHEN e.title LIKE '%Mathematics%' THEN 'Mathematics'
        ELSE 'General'
      END
    ELSE 'General'
  END
`;

function buildWhere({ startDate, endDate }) {
  let where = `WHERE se.status = 'completed'`;
  const params = [];
  if (startDate && endDate) {
    where += ` AND DATE(se.completed_at) BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  } else if (startDate || endDate) {
    const date = startDate || endDate;
    where += ` AND DATE(se.completed_at) = ?`;
    params.push(date);
  }
  return { where, params };
}

// GET /api/results
exports.getResults = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const { where, params } = buildWhere({ startDate, endDate });

    const [results] = await pool.query(
      `
      SELECT 
        u.full_name,
        u.state,
        u.district,
        e.exam_id,
        e.title AS exam_title,
        e.exam_type,
        e.category,
        e.total_marks,
        se.student_exam_id,
        ${SUBJECT_FALLBACK_SQL} AS subject,
        se.score,
        se.percentage,
        DATE_FORMAT(se.completed_at, '%Y-%m-%d') AS completed_on,
        CONCAT(FLOOR(e.duration/60), 'h ', LPAD(MOD(e.duration, 60), 2, '0'), 'm') AS time_spent,
        RANK() OVER (PARTITION BY se.exam_id ORDER BY se.score DESC) AS ranking,
        RANK() OVER (PARTITION BY u.state ORDER BY se.score DESC) AS state_rank,
        RANK() OVER (PARTITION BY u.district ORDER BY se.score DESC) AS district_rank,
        RANK() OVER (ORDER BY se.score DESC) AS india_rank
      FROM student_exams se
      JOIN users u ON se.user_id = u.user_id
      JOIN exams e ON se.exam_id = e.exam_id
      LEFT JOIN exam_subjects es ON e.exam_id = es.exam_id
      ${where}
      GROUP BY 
        se.student_exam_id, u.full_name, u.state, u.district,
        e.exam_id, e.title, e.exam_type, e.total_marks, e.category,
        se.score, se.percentage, se.completed_at, e.duration, e.exam_format
      `,
      params
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    next(new Error('Failed to fetch results'));
  }
};

// GET /api/results/:examId
exports.getResultsByExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const [results] = await pool.query(
      `
      SELECT 
        u.full_name,
        u.state,
        u.district,
        e.exam_id,
        e.title AS exam_title,
        e.exam_type,
        e.category,
        e.total_marks,
        se.student_exam_id,
        ${SUBJECT_FALLBACK_SQL} AS subject,
        se.score,
        se.percentage,
        DATE_FORMAT(se.completed_at, '%Y-%m-%d') AS completed_on,
        CONCAT(FLOOR(e.duration/60), 'h ', LPAD(MOD(e.duration, 60), 2, '0'), 'm') AS time_spent,
        RANK() OVER (PARTITION BY se.exam_id ORDER BY se.score DESC) AS ranking,
        RANK() OVER (PARTITION BY u.state ORDER BY se.score DESC) AS state_rank,
        RANK() OVER (PARTITION BY u.district ORDER BY se.score DESC) AS district_rank,
        RANK() OVER (ORDER BY se.score DESC) AS india_rank
      FROM student_exams se
      JOIN users u ON se.user_id = u.user_id
      JOIN exams e ON se.exam_id = e.exam_id
      LEFT JOIN exam_subjects es ON e.exam_id = es.exam_id
      WHERE se.exam_id = ? AND se.status = 'completed'
      GROUP BY 
        se.student_exam_id, u.full_name, u.state, u.district,
        e.exam_id, e.title, e.exam_type, e.total_marks, e.category,
        se.score, se.percentage, se.completed_at, e.duration, e.exam_format
      `,
      [examId]
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    next(new Error('Failed to fetch exam results'));
  }
};

// GET /api/results/subjects/:studentExamId
exports.getSubjectScores = async (req, res, next) => {
  try {
    const { studentExamId } = req.params;
    const [scores] = await pool.query(
      `
      SELECT es.subject, ses.score, ses.percentage
      FROM student_exam_subjects ses
      JOIN exam_subjects es ON ses.exam_subject_id = es.exam_subject_id
      WHERE ses.student_exam_id = ?
      `,
      [studentExamId]
    );
    res.json(scores);
  } catch (err) {
    console.error(err);
    next(new Error('Failed to fetch subject scores'));
  }
};

// GET /api/results/regions
exports.getRegions = async (req, res, next) => {
  try {
    const { state } = req.query;

    if (state) {
      const stateParam = String(state).trim();
      const [rows] = await pool.query(
        `
        SELECT DISTINCT TRIM(district) AS district
        FROM users
        WHERE state IS NOT NULL AND state <> ''
          AND district IS NOT NULL AND district <> ''
          AND TRIM(state) = ?
        ORDER BY district ASC
        `,
        [stateParam]
      );
      return res.json({ districts: rows.map(r => r.district) });
    }

    const [stateRows] = await pool.query(
      `
      SELECT DISTINCT TRIM(state) AS state
      FROM users
      WHERE state IS NOT NULL AND state <> ''
      ORDER BY state ASC
      `
    );

    const [districtRows] = await pool.query(
      `
      SELECT DISTINCT TRIM(district) AS district
      FROM users
      WHERE district IS NOT NULL AND district <> ''
      ORDER BY district ASC
      `
    );

    res.json({
      states: stateRows.map(s => s.state),
      districts: districtRows.map(d => d.district),
    });
  } catch (err) {
    console.error(err);
    next(new Error('Failed to fetch regions'));
  }
};

// NEW: GET /api/results/subjects-list[?examType=IIT|NEET]
// Prefer the authoritative list from exam_subjects; falls back to subjects table if needed.
exports.getSubjectsList = async (req, res, next) => {
  try {
    const { examType } = req.query;

    // Try from exam_subjects joined to exams (most accurate to actual exams taken)
    let sql = `
      SELECT DISTINCT es.subject AS name
      FROM exam_subjects es
      JOIN exams e ON es.exam_id = e.exam_id
    `;
    const params = [];
    if (examType && (examType === 'IIT' || examType === 'NEET')) {
      sql += ` WHERE e.exam_type = ?`;
      params.push(examType);
    }
    sql += ` ORDER BY name ASC`;

    const [rows] = await pool.query(sql, params);
    let subjects = rows.map(r => r.name);

    // Fallback to subjects table if exam_subjects is empty
    if (subjects.length === 0) {
      let sql2 = `SELECT DISTINCT name FROM subjects`;
      const params2 = [];
      if (examType && (examType === 'IIT' || examType === 'NEET')) {
        sql2 += ` WHERE exam_type = ?`;
        params2.push(examType);
      }
      sql2 += ` ORDER BY name ASC`;
      const [rows2] = await pool.query(sql2, params2);
      subjects = rows2.map(r => r.name);
    }

    res.json({ subjects });
  } catch (err) {
    console.error(err);
    next(new Error('Failed to fetch subjects list'));
  }
};
