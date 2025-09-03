const db = require('../../config/db');

// Get student results summary
exports.getMyResults = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch results
    const [rows] = await db.query(
      `SELECT se.exam_id, e.title, e.start_date as date, se.score, se.percentage 
       FROM student_exams se 
       JOIN exams e ON se.exam_id = e.exam_id
       WHERE se.user_id = ? AND se.status = 'completed'
       ORDER BY se.completed_at DESC`,
      [userId]
    );

    // Calculate rank & percentile for each
    for (let result of rows) {
      const [[{ total_students }]] = await db.query(
        `SELECT COUNT(*) as total_students FROM student_exams WHERE exam_id = ?`,
        [result.exam_id]
      );

      const [[{ below_me }]] = await db.query(
        `SELECT COUNT(*) as below_me FROM student_exams WHERE exam_id = ? AND score < ?`,
        [result.exam_id, result.score]
      );

      result.rank = total_students - below_me;
      result.percentile =
        total_students > 0 ? (below_me / total_students) * 100 : 0;
    }

    res.json(rows);
  } catch (err) {
    console.error('Get My Results Error:', err);
    res.status(500).json({ error: 'Server error fetching results' });
  }
};

// Get detailed exam result
exports.getExamResult = async (req, res) => {
  try {
    const userId = req.user.id;
    const examId = req.params.examId;

    // Get overall result
    const [[examResult]] = await db.query(
      `SELECT se.exam_id, e.title, e.start_date as date, se.score, se.percentage
       FROM student_exams se 
       JOIN exams e ON se.exam_id = e.exam_id
       WHERE se.user_id = ? AND se.exam_id = ?`,
      [userId, examId]
    );

    if (!examResult) {
      return res.status(404).json({ error: 'Result not found' });
    }

    // Rank + percentile
    const [[{ total_students }]] = await db.query(
      `SELECT COUNT(*) as total_students FROM student_exams WHERE exam_id = ?`,
      [examId]
    );

    const [[{ below_me }]] = await db.query(
      `SELECT COUNT(*) as below_me FROM student_exams WHERE exam_id = ? AND score < ?`,
      [examId, examResult.score]
    );

    examResult.rank = total_students - below_me;
    examResult.percentile =
      total_students > 0 ? (below_me / total_students) * 100 : 0;

    // Subject-wise results
    const [subjects] = await db.query(
      `SELECT subject, score, total_marks as total 
       FROM student_exam_subjects 
       WHERE student_exam_id = (SELECT student_exam_id FROM student_exams WHERE user_id = ? AND exam_id = ?)`,
      [userId, examId]
    );

    examResult.subjects = subjects;

    res.json(examResult);
  } catch (err) {
    console.error('Get Exam Result Error:', err);
    res.status(500).json({ error: 'Server error fetching exam result' });
  }
};
