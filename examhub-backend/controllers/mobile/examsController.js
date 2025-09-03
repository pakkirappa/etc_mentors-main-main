const db = require("../../config/db");

// List exams
exports.getExams = async (req, res) => {
  try {
    const filter = req.query.filter || "ALL";

    let query = `SELECT exam_id, title, exam_type, category, duration, total_marks, start_date, start_time, price_type, price_amount, status 
                 FROM exams 
                 WHERE status IN ('scheduled','active')`;

    const params = [];

    if (filter !== "ALL") {
      query += " AND (exam_type = ? OR category = ?)";
      params.push(filter, filter);
    }

    const [rows] = await db.query(query, params);

    res.json(rows);
  } catch (err) {
    console.error("Get Exams Error:", err);
    res.status(500).json({ error: "Server error fetching exams" });
  }
};

// Register exam
exports.registerExam = async (req, res) => {
  try {
    const userId = req.user.id;
    const examId = req.params.examId;

    // Check if already registered
    const [existing] = await db.query(
      `SELECT * FROM student_exams WHERE user_id = ? AND exam_id = ?`,
      [userId, examId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: "Already registered for this exam" });
    }

    await db.query(
      `INSERT INTO student_exams (user_id, exam_id, status) VALUES (?, ?, 'registered')`,
      [userId, examId]
    );

    res.json({ message: "Registered successfully" });
  } catch (err) {
    console.error("Register Exam Error:", err);
    res.status(500).json({ error: "Server error registering exam" });
  }
};

// Start exam
exports.startExam = async (req, res) => {
  try {
    const userId = req.user.id;
    const examId = req.params.examId;

    // Ensure student is registered
    const [check] = await db.query(
      `SELECT * FROM student_exams WHERE user_id = ? AND exam_id = ?`,
      [userId, examId]
    );

    if (check.length === 0) {
      return res.status(403).json({ error: "You are not registered for this exam" });
    }

    // Get exam details
    const [examRows] = await db.query(
      `SELECT exam_id, title, duration, total_marks FROM exams WHERE exam_id = ? AND status = 'active'`,
      [examId]
    );

    if (examRows.length === 0) {
      return res.status(400).json({ error: "Exam not active yet" });
    }

    const exam = examRows[0];

    // Get subjects
    const [subjects] = await db.query(
      `SELECT subject, marks FROM exam_subjects WHERE exam_id = ?`,
      [examId]
    );

    exam.subjects = subjects;

    res.json(exam);
  } catch (err) {
    console.error("Start Exam Error:", err);
    res.status(500).json({ error: "Server error starting exam" });
  }
};
