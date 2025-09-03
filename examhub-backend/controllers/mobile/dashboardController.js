const db = require("../../config/db");

// Summary: progress + rank
exports.getSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Progress
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) as total FROM student_exams WHERE user_id = ?`,
      [userId]
    );
    const [[{ completed }]] = await db.query(
      `SELECT COUNT(*) as completed FROM student_exams WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );
    const progress = total > 0 ? (completed / total) * 100 : 0;

    // Rank in latest completed exam
    const [latestExam] = await db.query(
      `SELECT exam_id, score 
       FROM student_exams 
       WHERE user_id = ? AND status = 'completed' 
       ORDER BY completed_at DESC LIMIT 1`,
      [userId]
    );

    let rankData = null;
    if (latestExam.length > 0) {
      const examId = latestExam[0].exam_id;
      const myScore = latestExam[0].score;

      const [[{ total_students }]] = await db.query(
        `SELECT COUNT(*) as total_students FROM student_exams WHERE exam_id = ?`,
        [examId]
      );

      const [[{ below_me }]] = await db.query(
        `SELECT COUNT(*) as below_me FROM student_exams WHERE exam_id = ? AND score < ?`,
        [examId, myScore]
      );

      const percentile = total_students > 0 ? (below_me / total_students) * 100 : 0;

      rankData = {
        latest_exam: examId,
        percentile,
        position: total_students - below_me,
        total_students
      };
    }

    res.json({ progress, rank: rankData });
  } catch (err) {
    console.error("Dashboard Summary Error:", err);
    res.status(500).json({ error: "Server error in summary" });
  }
};

// Ongoing exams
exports.getOngoingExams = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT e.exam_id, e.title, e.start_date, e.start_time, e.duration, se.status
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.exam_id
       WHERE se.user_id = ? AND e.status IN ('active') OR se.status = 'in_progress'`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Ongoing Exams Error:", err);
    res.status(500).json({ error: "Server error in ongoing exams" });
  }
};

// Recommended videos
exports.getVideos = async (req, res) => {
  try {
    const [videos] = await db.query(
      `SELECT video_id, title, video_url, thumbnail_url FROM videos ORDER BY created_at DESC LIMIT 10`
    );
    res.json(videos);
  } catch (err) {
    console.error("Videos Error:", err);
    res.status(500).json({ error: "Server error in videos" });
  }
};
