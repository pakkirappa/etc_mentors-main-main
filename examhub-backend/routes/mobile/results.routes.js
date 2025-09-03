const express = require('express');
const router = express.Router();
const resultsController = require('../../controllers/mobile/resultsController');
const auth = require('../../middleware/auth');

// My results (summary list)
router.get('/my', auth, resultsController.getMyResults);

// Detailed result
router.get('/:examId/details', auth, resultsController.getExamResult);

module.exports = router;
