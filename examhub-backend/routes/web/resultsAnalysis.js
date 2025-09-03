const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const resultsController = require('../../controllers/web/resultsAnalysis');

router.get('/', auth, resultsController.getResults);
router.get('/regions', auth, resultsController.getRegions);
router.get('/subjects-list', auth, resultsController.getSubjectsList);

// Keep subjects route above :examId
router.get(
  '/subjects/:studentExamId',
  auth,
  resultsController.getSubjectScores
);

// Put param route last
router.get('/:examId', auth, resultsController.getResultsByExam);

module.exports = router;
