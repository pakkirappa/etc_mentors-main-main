// routes/dashboard.js
const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const dashboardController = require('../../controllers/web/dashboard');

router.get('/stats', auth, dashboardController.getStats);
router.get('/recent-exams', auth, dashboardController.getRecentExams);

module.exports = router;