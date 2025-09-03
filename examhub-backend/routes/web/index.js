const express = require('express');
const router = express.Router();

router.use('/results', require('./resultsAnalysis'));
router.use('/students', require('./studentManagement'));
router.use('/settings', require('./settings'));
router.use('/help', require('./helpSupport'));
router.use('/announcements', require('./announcementsMedia'));
router.use('/dashboard', require('./dashboard'));
router.use('/exams', require('./examManagement'));
router.use('/subjects', require('./subjects'));
router.use('/roles', require('./roles'));
router.use('/previous-questions', require('./previous_questions'));

module.exports = router;
