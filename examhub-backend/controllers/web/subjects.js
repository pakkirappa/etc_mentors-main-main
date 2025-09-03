// New file: controllers/subjects.js
const pool = require('../../config/db');
const { validationResult } = require('express-validator');

exports.getSubjects = async (req, res, next) => {
  try {
    const [subjects] = await pool.query(`
      SELECT * FROM subjects ORDER BY exam_type, name
    `);
    res.json(subjects);
  } catch (err) {
    next(new Error('Failed to fetch subjects'));
  }
};

exports.createSubject = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, code, description, exam_type, is_active } = req.body;
    const [result] = await pool.query(`
      INSERT INTO subjects (name, code, description, exam_type, is_active)
      VALUES (?, ?, ?, ?, ?)
    `, [name, code, description, exam_type, is_active]);
    res.json({ message: 'Subject created', subject_id: result.insertId });
  } catch (err) {
    next(new Error('Failed to create subject'));
  }
};

exports.updateSubject = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { id } = req.params;
    const { name, code, description, exam_type, is_active } = req.body;
    let updateFields = [];
    let values = [];
    if (name !== undefined) {
      updateFields.push('name = ?');
      values.push(name);
    }
    if (code !== undefined) {
      updateFields.push('code = ?');
      values.push(code);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      values.push(description);
    }
    if (exam_type !== undefined) {
      updateFields.push('exam_type = ?');
      values.push(exam_type);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      values.push(is_active);
    }
    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    values.push(id);
    await pool.query(`
      UPDATE subjects SET ${updateFields.join(', ')} WHERE subject_id = ?
    `, values);
    res.json({ message: 'Subject updated' });
  } catch (err) {
    next(new Error('Failed to update subject'));
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(`
      DELETE FROM subjects WHERE subject_id = ?
    `, [id]);
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    next(new Error('Failed to delete subject'));
  }
};