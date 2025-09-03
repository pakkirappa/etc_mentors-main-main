const express = require('express');
const router = express.Router();
const profileController = require('../../controllers/mobile/profileController');
const auth = require('../../middleware/auth');

// Get profile
router.get('/me', auth, profileController.getProfile);

// Update profile
router.put('/update', auth, profileController.updateProfile);

module.exports = router;
