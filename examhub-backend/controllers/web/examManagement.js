// controllers/examManagement.js
const db = require('../../config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// Get all exams with optional date filtering
exports.getExams = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    let sql = `
      SELECT 
        e.*,
        subj.subjects,
        subj.subject_count,
        COALESCE(part.participants_count, 0) AS participants_count,
        COALESCE(qs.questions_count, 0) AS questions_count
      FROM exams e
      LEFT JOIN (
        SELECT exam_id, 
               GROUP_CONCAT(DISTINCT subject ORDER BY subject ASC) AS subjects,
               COUNT(DISTINCT exam_subject_id) AS subject_count
        FROM exam_subjects
        GROUP BY exam_id
      ) subj ON e.exam_id = subj.exam_id
      LEFT JOIN (
        SELECT exam_id, COUNT(DISTINCT user_id) AS participants_count
        FROM student_exams
        GROUP BY exam_id
      ) part ON e.exam_id = part.exam_id
      LEFT JOIN (
        SELECT exam_id, COUNT(DISTINCT question_id) AS questions_count
        FROM questions
        GROUP BY exam_id
      ) qs ON e.exam_id = qs.exam_id
      WHERE 1=1
    `;

    const params = [];

    if (startDate) {
      sql += ` AND e.start_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND e.start_date <= ?`;
      params.push(endDate);
    }
    if (category && category !== 'all') {
      // treat "all" as no filter
      sql += ` AND e.category = ?`;
      params.push(category);
    }

    sql += ` ORDER BY e.created_at DESC`;

    const [rows] = await db.query(sql, params);
    const formatted = rows.map(r => ({
      ...r,
      subjects: r.subjects ? r.subjects.split(',') : [],
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Get Exams Error:', err);
    res.status(500).json({ message: err.message });
  }
};

// Get single exam by ID (with subjects)
exports.getExamById = async (req, res) => {
  try {
    const examId = req.params.id;
    const [[exam]] = await db.query(`SELECT * FROM exams WHERE exam_id = ?`, [
      examId,
    ]);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const [subjects] = await db.query(
      `SELECT * FROM exam_subjects WHERE exam_id = ?`,
      [examId]
    );
    exam.subjects = subjects;

    res.json(exam);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// controllers/examManagement.js
exports.createExam = async (req, res) => {
  const {
    title,
    exam_type,
    exam_format,
    total_marks,
    duration,
    start_date,
    start_time,
    venue,
    description,
    subjects,
    category,
    set_type,
  } = req.body;

  if (
    !title ||
    !exam_type ||
    !exam_format ||
    !total_marks ||
    !duration ||
    !start_date ||
    !start_time
  ) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const isRealtime =
    String(category || '')
      .trim()
      .toLowerCase() === 'realtime';
  if (isRealtime && !String(set_type || '').trim()) {
    return res
      .status(400)
      .json({ message: 'set_type is required for Realtime exams' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Soft duplicate check (fast fail for better UX)
    if (isRealtime) {
      const [dup] = await conn.query(
        `SELECT 1 FROM exams 
         WHERE title=? AND start_date=? AND category=? AND set_type=? 
         LIMIT 1`,
        [title, start_date, category, set_type]
      );
      if (dup.length) {
        await conn.rollback();
        return res
          .status(409)
          .json({ message: 'This set already exists for this exam group.' });
      }
    }

    const [result] = await conn.query(
      `
      INSERT INTO exams (
        title, exam_type, exam_format, total_marks, duration,
        start_date, start_time, venue, status, description, category, set_type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        title,
        exam_type,
        exam_format,
        total_marks,
        duration,
        start_date,
        start_time,
        venue || 'Online Platform',
        'scheduled',
        description || null,
        category || null,
        isRealtime ? set_type : null,
      ]
    );

    const examId = result.insertId;

    if (Array.isArray(subjects) && subjects.length) {
      for (const s of subjects) {
        await conn.query(
          `INSERT INTO exam_subjects (exam_id, subject, marks) VALUES (?, ?, ?)`,
          [examId, s.subject, s.marks]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'Exam created', exam_id: examId });
  } catch (err) {
    await conn.rollback();
    // If unique index caught the duplicate
    if (err.code === 'ER_DUP_ENTRY') {
      return res
        .status(409)
        .json({ message: 'This set already exists for this exam group.' });
    }
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// controllers/examManagement.js
exports.cloneExamWithNewSet = async (req, res) => {
  const sourceId = req.params.id;
  const { set_type } = req.body;

  if (!String(set_type || '').trim()) {
    return res.status(400).json({ message: 'set_type is required' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Load the source exam
    const [rows] = await conn.query(
      `SELECT exam_id, title, exam_type, exam_format, total_marks, duration,
              start_date, start_time, venue, status, description, category
       FROM exams WHERE exam_id=?`,
      [sourceId]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Source exam not found' });
    }
    const src = rows[0];
    const isRealtime =
      String(src.category || '')
        .trim()
        .toLowerCase() === 'realtime';
    if (!isRealtime) {
      await conn.rollback();
      return res
        .status(400)
        .json({ message: 'Clone-set is only allowed for Realtime exams' });
    }

    // Prevent duplicate set in the same group (title+start_date+category)
    const [dup] = await conn.query(
      `SELECT 1 FROM exams 
       WHERE title=? AND start_date=? AND category=? AND set_type=? 
       LIMIT 1`,
      [src.title, src.start_date, src.category, set_type]
    );
    if (dup.length) {
      await conn.rollback();
      return res
        .status(409)
        .json({ message: 'This set already exists for this exam group.' });
    }

    // Insert new exam row with the new set_type
    const [ins] = await conn.query(
      `INSERT INTO exams (
        title, exam_type, exam_format, total_marks, duration,
        start_date, start_time, venue, status, description, category, set_type
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        src.title,
        src.exam_type,
        src.exam_format,
        src.total_marks,
        src.duration,
        src.start_date,
        src.start_time,
        src.venue,
        src.status,
        src.description,
        src.category,
        set_type,
      ]
    );
    const newExamId = ins.insertId;

    // Clone subjects
    const [subs] = await conn.query(
      `SELECT subject, marks FROM exam_subjects WHERE exam_id=?`,
      [src.exam_id]
    );
    if (subs.length) {
      for (const { subject, marks } of subs) {
        await conn.query(
          `INSERT INTO exam_subjects (exam_id, subject, marks) VALUES (?, ?, ?)`,
          [newExamId, subject, marks]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'New set created', exam_id: newExamId });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res
        .status(409)
        .json({ message: 'This set already exists for this exam group.' });
    }
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// Update exam (with subject deletion support)
exports.updateExam = async (req, res) => {
  const {
    title,
    exam_type,
    exam_format,
    total_marks,
    duration,
    start_date,
    start_time,
    venue,
    description,
    subjects,
    category, // <--- NEW
    set_type, // <--- NEW
  } = req.body;
  const examId = req.params.id;

  if (
    !title ||
    !exam_type ||
    !exam_format ||
    !total_marks ||
    !duration ||
    !start_date ||
    !start_time
  ) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (
    String(category || '')
      .trim()
      .toLowerCase() === 'realtime' &&
    !String(set_type || '').trim()
  ) {
    return res
      .status(400)
      .json({ message: 'set_type is required for Realtime exams' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `
      UPDATE exams
      SET title=?, exam_type=?, exam_format=?, total_marks=?, duration=?,
          start_date=?, start_time=?, venue=?, description=?, category=?, set_type=?
      WHERE exam_id=?
    `,
      [
        title,
        exam_type,
        exam_format,
        total_marks,
        duration,
        start_date,
        start_time,
        venue || 'Online Platform',
        description || null,
        category || null,
        set_type || null,
        examId,
      ]
    );

    await conn.query(`DELETE FROM exam_subjects WHERE exam_id=?`, [examId]);
    if (Array.isArray(subjects) && subjects.length > 0) {
      for (const subj of subjects) {
        await conn.query(
          `
          INSERT INTO exam_subjects (exam_id, subject, marks)
          VALUES (?, ?, ?)
        `,
          [examId, subj.subject, subj.marks]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'Exam updated successfully' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: 'Failed to update exam' });
  } finally {
    conn.release();
  }
};

// Delete exam
exports.deleteExam = async (req, res) => {
  try {
    await db.query(`DELETE FROM exams WHERE exam_id=?`, [req.params.id]);
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get questions for an exam (with MCQ options)
exports.getQuestions = async (req, res) => {
  try {
    const examId = req.params.id;
    const [questions] = await db.query(
      `SELECT * FROM questions WHERE exam_id = ?`,
      [examId]
    );

    for (const q of questions) {
      if (q.question_type === 'mcq') {
        const [options] = await db.query(
          `SELECT * FROM question_options WHERE question_id=? ORDER BY option_order`,
          [q.question_id]
        );
        q.options = options;
      }
    }

    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add question (MCQ or others)
exports.addQuestion = async (req, res) => {
  let {
    question_text,
    question_type,
    difficulty,
    marks,
    options,
    explanation = null,
  } = req.body;
  const examId = req.params.id;

  if (
    !examId ||
    !question_text ||
    !question_type ||
    !difficulty ||
    marks == null
  ) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  question_type = String(question_type).trim().toLowerCase();

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `
      INSERT INTO questions (exam_id, question_text, question_type, difficulty, marks${explanation != null ? ', explanation' : ''})
      VALUES (?, ?, ?, ?, ?${explanation != null ? ', ?' : ''})
      `,
      explanation != null
        ? [examId, question_text, question_type, difficulty, marks, explanation]
        : [examId, question_text, question_type, difficulty, marks]
    );
    const questionId = result.insertId;

    if (question_type === 'mcq' && Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        const row = options[i] || {};
        const isCorrect =
          row.is_correct === 1 ||
          row.is_correct === true ||
          row.is_correct === '1';
        await conn.query(
          `INSERT INTO question_options (question_id, option_text, is_correct, option_order)
           VALUES (?, ?, ?, ?)`,
          [questionId, row.option_text || '', isCorrect ? 1 : 0, i]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'Question added', question_id: questionId });
  } catch (err) {
    await conn.rollback();
    console.error('addQuestion error:', err);
    res.status(500).json({ message: 'Failed to add question' });
  } finally {
    conn.release();
  }
};

// Update question
exports.updateQuestion = async (req, res) => {
  const { question_text, question_type, difficulty, marks, options } = req.body;
  const { id: examId, questionId } = req.params;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `
      UPDATE questions
      SET question_text=?, question_type=?, difficulty=?, marks=?
      WHERE question_id=? AND exam_id=?
    `,
      [question_text, question_type, difficulty, marks, questionId, examId]
    );

    // Replace options if MCQ
    await conn.query(`DELETE FROM question_options WHERE question_id=?`, [
      questionId,
    ]);
    if (question_type === 'mcq' && Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        await conn.query(
          `
          INSERT INTO question_options (question_id, option_text, is_correct, option_order)
          VALUES (?, ?, ?, ?)
        `,
          [
            questionId,
            options[i].option_text,
            options[i].is_correct || false,
            i,
          ]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'Question updated' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// Delete question
exports.deleteQuestion = async (req, res) => {
  try {
    await db.query(`DELETE FROM questions WHERE question_id=? AND exam_id=?`, [
      req.params.questionId,
      req.params.id,
    ]);
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Register students to an exam
exports.registerStudents = async (req, res) => {
  const { user_ids } = req.body;
  const examId = req.params.id;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const uid of user_ids) {
      await conn.query(
        `
        INSERT INTO student_exams (user_id, exam_id, status)
        VALUES (?, ?, 'registered')
        ON DUPLICATE KEY UPDATE status='registered'
      `,
        [uid, examId]
      );
    }
    await conn.commit();
    res.json({ message: 'Students registered' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
};

// ===== META: QUESTION TYPES =====
exports.getQuestionTypesMeta = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT question_type AS name
       FROM questions
       WHERE question_type IS NOT NULL AND question_type <> ''
       ORDER BY question_type ASC`
    );
    // return as simple array of strings for the UI
    res.json(rows.map(r => r.name));
  } catch (err) {
    console.error('getQuestionTypesMeta error:', err);
    res.status(500).json({ message: 'Failed to load question types' });
  }
};

exports.createQuestionTypeMeta = async (req, res) => {
  try {
    let { name } = req.body || {};
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    name = name.trim().toLowerCase();

    await db.query(
      `INSERT IGNORE INTO question_types (name, is_active) VALUES (?, TRUE)`,
      [name]
    );

    const [[row]] = await db.query(
      `SELECT id, name FROM question_types WHERE name = ?`,
      [name]
    );

    res.json(row);
  } catch (err) {
    console.error('createQuestionTypeMeta error:', err);
    res.status(500).json({ message: 'Failed to create question type' });
  }
};
exports.getExamCategoriesMeta = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT category AS category
         FROM exams
        WHERE category IS NOT NULL AND category <> ''
        ORDER BY category ASC`
    );
    res.json(rows.map(r => r.category));
  } catch (err) {
    console.error('getExamCategoriesMeta error:', err);
    res.status(500).json({ message: 'Failed to load exam categories' });
  }
};

// --- DOWNLOAD QUESTIONS TEMPLATE (XLSX) ---
exports.downloadQuestionsTemplate = async (req, res) => {
  try {
    const examId = req.params.id;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Questions Template');

    // Define headers
    const headers = [
      'question_text',
      'question_type',
      'difficulty',
      'marks',
      'explanation',
      'option_A',
      'option_B',
      'option_C',
      'option_D',
      'option_E',
      'option_F',
      'option_G',
      'option_H',
      'correct_option',
    ];

    sheet.addRow(headers);

    // Sample MCQ row
    sheet.addRow([
      'What is 2 + 2?',
      'mcq',
      'easy',
      1,
      'Basic arithmetic.',
      '3',
      '4',
      '5',
      '6',
      '',
      '',
      '',
      '',
      'B',
    ]);

    // Sample Descriptive row
    sheet.addRow([
      "Explain Newton's second law in one or two lines.",
      'descriptive',
      'medium',
      5,
      'Mention F = m·a and its implications.',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=questions_template_exam_${examId || 'sample'}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('downloadQuestionsTemplate error:', err);
    res.status(500).json({ message: 'Failed to generate XLSX template' });
  }
};

exports.getExamTypesMeta = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT exam_type AS examType
         FROM exams
        WHERE exam_type IS NOT NULL AND exam_type <> ''
        ORDER BY exam_type ASC`
    );
    res.json(rows.map(r => r.examType));
  } catch (err) {
    console.error('getExamTypesMeta error:', err);
    res.status(500).json({ message: 'Failed to load exam types' });
  }
};

exports.downloadAnswerKeyPdf = async (req, res) => {
  try {
    const examId = req.params.id;

    // Load exam header
    const [[exam]] = await db.query(
      `SELECT exam_id, title, exam_type, exam_format, total_marks, duration, start_date, start_time
         FROM exams WHERE exam_id = ?`,
      [examId]
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Load questions (+ mcq options)
    const [questions] = await db.query(
      `SELECT question_id, question_text, question_type, difficulty, marks
         FROM questions WHERE exam_id = ? ORDER BY question_id ASC`,
      [examId]
    );

    // Fetch options for mcq in one go
    const [options] = await db.query(
      `SELECT question_id, option_text, is_correct, option_order
         FROM question_options
        WHERE question_id IN (${questions.length ? questions.map(q => q.question_id).join(',') : 'NULL'})
        ORDER BY question_id, option_order`
    );

    const optionsByQ = new Map();
    for (const o of options) {
      if (!optionsByQ.has(o.question_id)) optionsByQ.set(o.question_id, []);
      optionsByQ.get(o.question_id).push(o);
    }

    // Prepare PDF
    const doc = new PDFDocument({ margin: 50 });
    const filename = `exam_${examId}_answer_key.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Header
    doc.fontSize(18).text(`${exam.title} — Answer Key`, { align: 'center' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .text(`Exam Type: ${exam.exam_type || '-'}`)
      .text(`Format: ${exam.exam_format || '-'}`)
      .text(
        `Total Marks: ${exam.total_marks ?? 0} | Duration: ${exam.duration ?? 0} min`
      )
      .text(`Start: ${exam.start_date || '-'} ${exam.start_time || ''}`);
    doc.moveDown();

    // Table-ish listing
    let qNum = 1;
    const letter = i => String.fromCharCode(65 + i);

    for (const q of questions) {
      doc.moveDown(0.3);
      doc
        .fontSize(12)
        .text(`Q${qNum}. ${q.question_text}`, { continued: false });

      if (q.question_type === 'mcq') {
        const opts = optionsByQ.get(q.question_id) || [];
        const correctIndex = opts.findIndex(o => o.is_correct === 1);
        const correctLabel = correctIndex >= 0 ? letter(correctIndex) : '—';

        doc
          .fontSize(10)
          .text(
            `Type: MCQ  |  Marks: ${q.marks ?? 0}  |  Difficulty: ${q.difficulty || '-'}`
          );
        doc.text(`Answer: ${correctLabel}`);
      } else {
        doc
          .fontSize(10)
          .text(
            `Type: ${q.question_type.toUpperCase()}  |  Marks: ${q.marks ?? 0}  |  Difficulty: ${q.difficulty || '-'}`
          );
        doc.text(`Answer: — (no fixed key)`);
      }

      doc.moveDown(0.2);
      doc
        .moveTo(doc.x, doc.y)
        .lineTo(550, doc.y)
        .strokeColor('#cccccc')
        .stroke();
      qNum++;
    }

    doc.end();
  } catch (err) {
    console.error('downloadAnswerKeyPdf error:', err);
    res.status(500).json({ message: 'Failed to generate Answer Key PDF' });
  }
};

// controllers/examManagement.js
exports.getSetsForExamGroup = async (req, res) => {
  const examId = req.params.id;
  try {
    // Load the base exam (for group keys)
    const [rows] = await db.query(
      `
      SELECT title, start_date, category
      FROM exams
      WHERE exam_id=?
      LIMIT 1
    `,
      [examId]
    );

    if (!rows.length)
      return res.status(404).json({ message: 'Exam not found' });
    const { title, start_date, category } = rows[0];

    // Fetch all sets in the same group
    const [sets] = await db.query(
      `
      SELECT exam_id, set_type
      FROM exams
      WHERE title=? AND start_date=? AND category=?
      ORDER BY set_type ASC
    `,
      [title, start_date, category]
    );

    res.json({
      group: { title, start_date, category },
      sets: sets.map(s => s.set_type).filter(Boolean),
      count: sets.filter(s => !!s.set_type).length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
