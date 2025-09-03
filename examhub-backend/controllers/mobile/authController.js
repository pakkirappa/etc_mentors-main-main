const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'examhub_secret';

// ======================= REGISTER =======================
exports.register = async (req, res) => {
  try {
    const {
      username,
      email,
      mobile,
      password,
      parent_name,
      parent_mobile,
      education_level,
      country,
      state,
      city,
      address,
      dob,
      profile_image,
    } = req.body;

    if (!username || !email || !mobile || !password) {
      return res
        .status(400)
        .json({ error: 'Username, Email, Mobile, and Password are required' });
    }

    // Check if email/mobile already exists
    const [existing] = await db.query(
      `SELECT user_id FROM users WHERE email = ? OR mobile = ? OR username = ?`,
      [email, mobile, username]
    );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({
          error: 'User with given email, mobile or username already exists',
        });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into DB
    const [result] = await db.query(
      `INSERT INTO users 
      (username, email, mobile, password_hash, role, status, parent_name, parent_mobile, education_level, country, state, city, address, dob, profile_image) 
      VALUES (?, ?, ?, ?, 'student', 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        email,
        mobile,
        hashedPassword,
        parent_name,
        parent_mobile,
        education_level,
        country,
        state,
        city,
        address,
        dob,
        profile_image,
      ]
    );

    return res.status(201).json({
      message: 'Registration successful',
      user_id: result.insertId,
    });
  } catch (err) {
    console.error('Register Error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
};

// ======================= LOGIN =======================
exports.login = async (req, res) => {
  try {
    const { email_or_mobile, password } = req.body;

    if (!email_or_mobile || !password) {
      return res
        .status(400)
        .json({ error: 'Email/Mobile and Password are required' });
    }

    // Find user by email OR mobile OR username
    const [rows] = await db.query(
      `SELECT * FROM users WHERE email = ? OR mobile = ? OR username = ? LIMIT 1`,
      [email_or_mobile, email_or_mobile, email_or_mobile]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.user_id, role: user.role }, JWT_SECRET, {
      expiresIn: '1h',
    });

    // Response with safe user data
    return res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        full_name: user.full_name,
        parent_name: user.parent_name,
        parent_mobile: user.parent_mobile,
        education_level: user.education_level,
        country: user.country,
        state: user.state,
        city: user.city,
        address: user.address,
        dob: user.dob,
        profile_image: user.profile_image,
      },
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
};
