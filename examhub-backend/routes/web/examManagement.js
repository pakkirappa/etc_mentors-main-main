const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const examController = require('../../controllers/web/examManagement');

// Exam CRUD
router.get('/', auth, examController.getExams);
router.get('/:id', auth, examController.getExamById);
router.post('/', auth, examController.createExam);
router.put('/:id', auth, examController.updateExam);
router.delete('/:id', auth, examController.deleteExam);

// Question Management
router.get('/:id/questions', auth, examController.getQuestions);
router.post('/:id/questions', auth, examController.addQuestion);
router.put('/:id/questions/:questionId', auth, examController.updateQuestion);
router.delete(
  '/:id/questions/:questionId',
  auth,
  examController.deleteQuestion
);
router.get('/meta/question-types', auth, examController.getQuestionTypesMeta);
router.get('/meta/exam-categories', auth, examController.getExamCategoriesMeta);
router.get(
  '/:id/questions/template.csv',
  auth,
  examController.downloadQuestionsTemplate
);
router.get('/meta/exam-types', auth, examController.getExamTypesMeta);
// Exam Key PDF
router.get('/:id/answer-key.pdf', auth, examController.downloadAnswerKeyPdf);
router.post('/:id/create-set', auth, examController.cloneExamWithNewSet);
// routes/exams.js
router.get('/:id/sets', auth, examController.getSetsForExamGroup);
module.exports = router;
