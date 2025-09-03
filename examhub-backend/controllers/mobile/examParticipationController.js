const db = require("../../config/db");

// Fetch questions (paginated)
exports.getQuestions = async (req, res) => {
  try {
    const examId = req.params.examId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Questions
    const [questions] = await db.query(
      `SELECT question_id, question_text, question_type, marks 
       FROM questions WHERE exam_id = ? LIMIT ? OFFSET ?`,
      [examId, limit, offset]
    );

    // Options for MCQs
    for (let q of questions) {
      if (q.question_type === "mcq") {
        const [options] = await db.query(
          `SELECT option_id, option_text FROM question_options WHERE question_id = ?`,
          [q.question_id]
        );
        q.options = options;
      }
    }

    res.json({ exam_id: examId, questions });
  } catch (err) {
    console.error("Get Questions Error:", err);
    res.status(500).json({ error: "Server error fetching questions" });
  }
};

// Save answer
exports.saveAnswer = async (req, res) => {
  try {
    const userId = req.user.id;
    const examId = req.params.examId;
    const questionId = req.params.questionId;

    // Safe destructuring
    const { selected_option_ids = null, answer_text = null } = req.body || {};

    if (!selected_option_ids && !answer_text) {
      return res.status(400).json({ error: "Answer data is required" });
    }

    // Get student_exam_id
    const [[studentExam]] = await db.query(
      `SELECT student_exam_id FROM student_exams WHERE user_id = ? AND exam_id = ?`,
      [userId, examId]
    );

    if (!studentExam) {
      return res.status(403).json({ error: "Not registered for this exam" });
    }

    const studentExamId = studentExam.student_exam_id;

    // Check correctness for MCQ
    let isCorrect = null;
    if (selected_option_ids) {
      const [correctOptions] = await db.query(
        `SELECT option_id FROM question_options WHERE question_id = ? AND is_correct = 1`,
        [questionId]
      );
      const correctIds = correctOptions.map(o => o.option_id);
      isCorrect =
        JSON.stringify(correctIds.sort()) ===
        JSON.stringify(selected_option_ids.sort());
    }

    // Upsert answer
    await db.query(
      `INSERT INTO student_answers (student_exam_id, question_id, selected_option_ids, answer_text, is_correct) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         selected_option_ids = VALUES(selected_option_ids), 
         answer_text = VALUES(answer_text), 
         is_correct = VALUES(is_correct)`,
      [
        studentExamId,
        questionId,
        selected_option_ids ? JSON.stringify(selected_option_ids) : null,
        answer_text,
        isCorrect
      ]
    );

    res.json({ message: "Answer saved successfully" });
  } catch (err) {
    console.error("Save Answer Error:", err);
    res.status(500).json({ error: "Server error saving answer" });
  }
};


// Submit exam
exports.submitExam = async (req, res) => {
  try {
    const userId = req.user.id;
    const examId = req.params.examId;

    // Get student_exam_id
    const [[studentExam]] = await db.query(
      `SELECT student_exam_id FROM student_exams WHERE user_id = ? AND exam_id = ?`,
      [userId, examId]
    );

    if (!studentExam) {
      return res.status(403).json({ error: "Not registered for this exam" });
    }

    const studentExamId = studentExam.student_exam_id;

    // Calculate score
    const [answers] = await db.query(
      `SELECT a.is_correct, q.marks 
       FROM student_answers a 
       JOIN questions q ON a.question_id = q.question_id 
       WHERE a.student_exam_id = ?`,
      [studentExamId]
    );

    let score = 0;
    answers.forEach(a => {
      if (a.is_correct) score += a.marks;
    });

    // Get total marks
    const [[exam]] = await db.query(
      `SELECT total_marks FROM exams WHERE exam_id = ?`,
      [examId]
    );

    const percentage = exam.total_marks > 0 ? (score / exam.total_marks) * 100 : 0;

    // Update student_exams
    await db.query(
      `UPDATE student_exams SET score = ?, percentage = ?, status = 'completed', completed_at = NOW() WHERE student_exam_id = ?`,
      [score, percentage, studentExamId]
    );

    res.json({ message: "Exam submitted", score, percentage, status: "completed" });
  } catch (err) {
    console.error("Submit Exam Error:", err);
    res.status(500).json({ error: "Server error submitting exam" });
  }
};
