const express = require("express");
const router = express.Router();
const examsController = require("../../controllers/mobile/examsController");
const auth = require("../../middleware/auth");

// Exam listing
router.get("/list", auth, examsController.getExams);

// Register for exam
router.post("/:examId/register", auth, examsController.registerExam);

// Start exam
router.get("/:examId/start", auth, examsController.startExam);

module.exports = router;
