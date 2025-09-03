// controllers/studentManagement.js
const pool = require('../../config/db');
const { validationResult } = require('express-validator');

exports.getStudents = async (req, res, next) => {
  try {
    const { state, district, region, college, status } = req.query;

    const where = [`role = 'student'`];
    const params = [];

    if (state) {
      where.push(`state = ?`);
      params.push(state);
    }
    if (district) {
      where.push(`district = ?`);
      params.push(district);
    }
    if (region) {
      where.push(`region = ?`);
      params.push(region);
    }
    if (college) {
      where.push(`college = ?`);
      params.push(college);
    }
    if (status) {
      where.push(`status = ?`);
      params.push(status);
    }

    const sql = `
      SELECT user_id, student_id, username, email, full_name, status,
             state, district, region, college, created_at, updated_at
      FROM users
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY user_id DESC
    `;
    const [students] = await pool.query(sql, params);
    res.json(students);
  } catch (err) {
    next(new Error('Failed to fetch students'));
  }
};

exports.addStudent = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  try {
    const {
      student_id,
      username,
      email,
      password_hash,
      full_name,
      state,
      district,
      region,
      college,
    } = req.body;

    const [result] = await pool.query(
      `
      INSERT INTO users
      (student_id, username, email, password_hash, full_name, role, status, state, district, region, college, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'student', 'active', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
      [
        student_id,
        username,
        email,
        password_hash,
        full_name,
        state || null,
        district || null,
        region || null,
        college || null,
      ]
    );

    res.status(201).json({
      user_id: result.insertId,
      student_id,
      username,
      email,
      full_name,
      status: 'active',
      state,
      district,
      region,
      college,
    });
  } catch (err) {
    next(new Error('Failed to add student'));
  }
};

exports.updateStudent = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query(
      `
      UPDATE users
      SET status = ?
      WHERE user_id = ? AND role = 'student'
    `,
      [status, id]
    );
    res.json({ message: 'Student updated' });
  } catch (err) {
    next(new Error('Failed to update student'));
  }
};

exports.getStudentExams = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [exams] = await pool.query(
      `
      SELECT e.title, e.exam_type, e.start_date, e.start_time, se.status
      FROM student_exams se
      JOIN exams e ON se.exam_id = e.exam_id
      WHERE se.user_id = ?
    `,
      [id]
    );
    res.json(exams);
  } catch (err) {
    next(new Error('Failed to fetch student exams'));
  }
};

exports.getStudentFilterOptions = async (req, res, next) => {
  try {
    const [states] = await pool.query(
      `SELECT DISTINCT state   FROM users WHERE role='student' AND state   IS NOT NULL AND state   <> '' ORDER BY state`
    );
    const [districts] = await pool.query(
      `SELECT DISTINCT district FROM users WHERE role='student' AND district IS NOT NULL AND district <> '' ORDER BY district`
    );
    const [regions] = await pool.query(
      `SELECT DISTINCT region   FROM users WHERE role='student' AND region   IS NOT NULL AND region   <> '' ORDER BY region`
    );
    const [colleges] = await pool.query(
      `SELECT DISTINCT college  FROM users WHERE role='student' AND college  IS NOT NULL AND college  <> '' ORDER BY college`
    );
    const [statuses] = await pool.query(
      `SELECT DISTINCT status  FROM users WHERE role='student' AND status  IS NOT NULL AND status  <> '' ORDER BY status`
    );

    res.json({
      states: states.map(r => r.state),
      districts: districts.map(r => r.district),
      regions: regions.map(r => r.region),
      colleges: colleges.map(r => r.college),
      statuses: statuses.map(r => r.status),
    });
  } catch (err) {
    next(new Error('Failed to fetch filter options'));
  }
};

// View single student by ID
exports.getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `
      SELECT user_id, student_id, username, email, full_name, status
      FROM users
      WHERE user_id = ? AND role = 'student'
    `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(new Error('Failed to fetch student'));
  }
};

// Edit/update student details (except password)
exports.editStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      student_id,
      username,
      email,
      full_name,
      status,
      state,
      district,
      region,
      college,
    } = req.body;

    const [existing] = await pool.query(
      `SELECT * FROM users WHERE user_id = ? AND role = 'student'`,
      [id]
    );
    if (existing.length === 0)
      return res.status(404).json({ message: 'Student not found' });

    const [conflicts] = await pool.query(
      `
      SELECT user_id FROM users 
      WHERE role = 'student' AND user_id != ? AND (username = ? OR student_id = ? OR email = ?)
    `,
      [id, username, student_id, email]
    );
    if (conflicts.length > 0)
      return res.status(400).json({
        message:
          'Username, Student ID or Email already in use by another student',
      });

    await pool.query(
      `
      UPDATE users
      SET student_id = ?, username = ?, email = ?, full_name = ?, status = ?,
          state = ?, district = ?, region = ?, college = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND role = 'student'
    `,
      [
        student_id,
        username,
        email,
        full_name,
        status,
        state || null,
        district || null,
        region || null,
        college || null,
        id,
      ]
    );

    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    next(new Error('Failed to update student'));
  }
};

// Delete student by ID
exports.deleteStudent = async (req, res) => {
  const id = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM users WHERE user_id = ?', [
      id,
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
