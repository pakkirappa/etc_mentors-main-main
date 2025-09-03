const pool = require('../../config/db');

// Ensure array -> JSON string for DB
const toJson = arr => JSON.stringify(arr || []);

exports.list = async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT role_id, name, description, permissions, is_system, created_at, updated_at
      FROM roles ORDER BY name
    `);
    // Normalize JSON for frontend
    const data = rows.map(r => ({
      ...r,
      permissions: Array.isArray(r.permissions)
        ? r.permissions
        : JSON.parse(r.permissions || '[]'),
    }));
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, permissions } = req.body;
    await pool.query(
      `INSERT INTO roles (name, description, permissions) VALUES (?, ?, CAST(? AS JSON))`,
      [name, description || null, toJson(permissions)]
    );
    res.status(201).json({ message: 'Role created' });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;
    await pool.query(
      `UPDATE roles SET name=?, description=?, permissions=CAST(? AS JSON), updated_at=NOW()
       WHERE role_id=? AND is_system=FALSE`,
      [name, description || null, toJson(permissions), id]
    );
    res.json({ message: 'Role updated' });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM roles WHERE role_id=? AND is_system=FALSE`, [
      id,
    ]);
    res.json({ message: 'Role deleted' });
  } catch (e) {
    next(e);
  }
};
