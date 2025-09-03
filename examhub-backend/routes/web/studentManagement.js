// routes/studentManagement.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../../middleware/auth');
const studentController = require('../../controllers/web/studentManagement');

router.get('/', auth, studentController.getStudents);
router.get('/filters', auth, studentController.getStudentFilterOptions);
router.post(
  '/',
  auth,
  [
    body('student_id').notEmpty(),
    body('username').notEmpty(),
    body('email').isEmail(),
    body('password_hash').notEmpty(),
    body('full_name').notEmpty(),
  ],
  studentController.addStudent
);
router.put(
  '/:id',
  auth,
  [body('status').isIn(['active', 'inactive', 'suspended'])],
  studentController.updateStudent
);
router.get('/:id/exams', auth, studentController.getStudentExams);
// View a single student
router.get('/:id', auth, studentController.getStudentById);

// Update student details
router.put(
  '/:id/details',
  auth,
  [
    // Add validation rules for fields you want to allow updating
    body('student_id').notEmpty(),
    body('username').notEmpty(),
    body('email').isEmail(),
    body('full_name').notEmpty(),
    body('status').isIn(['active', 'inactive', 'suspended']),
  ],
  studentController.editStudent
);

// Delete student
router.delete('/:id', auth, studentController.deleteStudent);

module.exports = router;
