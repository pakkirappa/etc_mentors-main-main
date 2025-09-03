// New file: routes/subjects.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../../middleware/auth');
const subjectsController = require('../../controllers/web/subjects');

router.get('/', auth, subjectsController.getSubjects);

router.post(
  '/',
  auth,
  [
    body('name').notEmpty().trim(),
    body('code').notEmpty().trim(),
    body('exam_type').isIn(['IIT', 'NEET']),
    body('is_active').isBoolean(),
  ],
  subjectsController.createSubject
);

router.put(
  '/:id',
  auth,
  [
    body('name').optional().trim(),
    body('code').optional().trim(),
    body('exam_type').optional().isIn(['IIT', 'NEET']),
    body('is_active').optional().isBoolean(),
  ],
  subjectsController.updateSubject
);

router.delete('/:id', auth, subjectsController.deleteSubject);

module.exports = router;
