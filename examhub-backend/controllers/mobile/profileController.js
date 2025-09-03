const db = require('../../config/db');

// Get student profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT user_id, username, email, mobile, dob, profile_image, 
              parent_name, parent_mobile, education_level, country, state, city, college, address
       FROM users WHERE user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Get Profile Error:', err);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      mobile,
      parent_name,
      parent_mobile,
      education_level,
      country,
      state,
      city,
      college,
      address,
      dob,
      profile_image,
    } = req.body;

    await db.query(
      `UPDATE users 
       SET mobile = ?, parent_name = ?, parent_mobile = ?, education_level = ?, 
           country = ?, state = ?, city = ?, college = ?, address = ?, dob = ?, profile_image = ? 
       WHERE user_id = ?`,
      [
        mobile,
        parent_name,
        parent_mobile,
        education_level,
        country,
        state,
        city,
        college,
        address,
        dob,
        profile_image,
        userId,
      ]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ error: 'Server error updating profile' });
  }
};
