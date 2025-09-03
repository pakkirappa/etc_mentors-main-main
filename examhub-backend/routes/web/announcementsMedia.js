// routes/announcementsMedia.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../../middleware/auth');
const announcementsController = require('../../controllers/web/announcementsMedia');

// Routes
router.get('/', auth, announcementsController.getAnnouncements);

router.post(
  '/',
  auth,
  [
    body('title').notEmpty(),
    body('content').notEmpty(),
    body('announcement_type').isIn(['announcement', 'poster', 'video']),
    body('priority').isIn(['high', 'medium', 'low']),
    body('target_audience').isIn([
      'All Students',
      'IIT Students',
      'NEET Students',
    ]),
    body('status').isIn(['active', 'scheduled', 'expired', 'draft']),
  ],
  announcementsController.createAnnouncement
);

router.put(
  '/:id',
  auth,
  [body('title').notEmpty(), body('content').notEmpty()],
  announcementsController.updateAnnouncement
);

router.delete('/:id', auth, announcementsController.deleteAnnouncement);

// --- NEW: S3 Upload endpoint only ---
router.post('/upload', auth, announcementsController.uploadFile);

module.exports = router;
