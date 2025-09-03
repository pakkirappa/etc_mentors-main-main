// controllers/settings.js
const pool = require('../../config/db');
const { validationResult } = require('express-validator');

exports.getSettings = async (req, res, next) => {
  try {
    const [settings] = await pool.query(`
      SELECT setting_key, setting_value
      FROM settings
    `);
    res.json(settings);
  } catch (err) {
    next(new Error('Failed to fetch settings'));
  }
};

exports.updateSetting = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { key } = req.params;
    const { setting_value } = req.body;
    const userId = 1; // Assume admin user_id=1 for demo
    await pool.query(
      `
      INSERT INTO settings (setting_key, setting_value, updated_by)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE setting_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
    `,
      [
        key,
        JSON.stringify(setting_value),
        userId,
        JSON.stringify(setting_value),
        userId,
      ]
    );
    res.json({ message: 'Setting updated' });
  } catch (err) {
    next(new Error('Failed to update setting'));
  }
};

exports.getUserMetrics = async (req, res, next) => {
  try {
    const [[{ total_users }]] = await pool.query(
      `SELECT COUNT(*) AS total_users FROM users`
    );

    const [[{ active_students }]] = await pool.query(
      `SELECT COUNT(*) AS active_students
         FROM users
        WHERE LOWER(role) = 'student' AND LOWER(status) = 'active'`
    );

    // Count all admins (any status)
    const [[{ administrators }]] = await pool.query(
      `SELECT COUNT(*) AS administrators
         FROM users
        WHERE LOWER(role) IN ('admin','administrator','administrators')`
    );

    const [byRole] = await pool.query(
      `SELECT LOWER(role) AS role, COUNT(*) AS count
         FROM users
        GROUP BY LOWER(role)
        ORDER BY role`
    );

    res.json({ total_users, active_students, administrators, by_role: byRole });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/default-roles
// Pull mapping from settings if present; otherwise fall back to sensible defaults.
exports.getDefaultRoles = async (req, res, next) => {
  try {
    // Try settings table first
    const [rows] = await pool.query(
      `SELECT setting_value
         FROM settings
        WHERE setting_key = 'default_roles'
        LIMIT 1`
    );

    if (rows.length) {
      // stored as JSON by our existing settings controller convention
      const val = rows[0].setting_value;
      // Some MySQL clients return already-parsed object; normalize:
      const parsed = typeof val === 'string' ? JSON.parse(val) : val;
      return res.json(parsed);
    }

    // Fallback: prefer roles that exist in the roles table, otherwise defaults.
    const [roleRows] = await pool.query(
      `SELECT LOWER(name) AS name FROM roles`
    );
    const roleSet = new Set(roleRows.map(r => r.name));

    const defaults = {
      new_students: roleSet.has('student') ? 'student' : 'student',
      teachers: roleSet.has('instructor')
        ? 'instructor'
        : roleSet.has('teacher')
          ? 'teacher'
          : 'instructor',
      administrators: roleSet.has('admin') ? 'admin' : 'admin',
    };

    res.json(defaults);
  } catch (err) {
    next(err);
  }
};
