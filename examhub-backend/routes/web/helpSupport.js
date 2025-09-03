// routes/helpSupport.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../../middleware/auth');
const helpController = require('../../controllers/web/helpSupport');

router.get('/faqs', auth, helpController.getFaqs);
router.get('/guides', auth, helpController.getGuides);
router.get('/videos', auth, helpController.getVideos);
router.post('/tickets', auth, [
  body('issue_type').isIn(['Technical Issue', 'Account Problem', 'Feature Request', 'Other']),
  body('description').notEmpty()
], helpController.submitTicket);

module.exports = router;