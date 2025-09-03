const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/mobile/dashboardController');
const auth = require('../../middleware/auth');

// Dashboard summary
router.get('/summary', auth, dashboardController.getSummary);

// Ongoing exams
router.get('/ongoing', auth, dashboardController.getOngoingExams);

// Recommended videos
router.get('/videos', auth, dashboardController.getVideos);

module.exports = router;
