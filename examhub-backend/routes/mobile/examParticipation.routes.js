const express = require("express");
const router = express.Router();
const participationController = require("../../controllers/mobile/examParticipationController");
const auth = require("../../middleware/auth");

// Fetch questions
router.get("/:examId/questions", auth, participationController.getQuestions);

// Save answer
router.post("/:examId/questions/:questionId/answer", auth, participationController.saveAnswer);

// Submit exam
router.post("/:examId/submit", auth, participationController.submitExam);

module.exports = router;
