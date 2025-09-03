-- widen exam_type to free text
ALTER TABLE examhubdb.exams
  MODIFY exam_type VARCHAR(100) NOT NULL;

-- adding district and region columns in users table
ALTER TABLE examhubdb.users
  ADD COLUMN region  VARCHAR(100) NULL AFTER district,
  ADD COLUMN college VARCHAR(150) NULL AFTER region;

-- Update existing row
UPDATE examhubdb.users
SET region = 'Bengaluru', college = 'RV College of Engineering'
WHERE user_id = 7;

-- Drop if you already created it
DROP TABLE IF EXISTS examhubdb.previous_question_sets;

CREATE TABLE examhubdb.previous_question_sets (
  pqs_id             BIGINT PRIMARY KEY AUTO_INCREMENT,
  course             VARCHAR(100) NOT NULL,             -- IIT, NEET, etc.
  subject_mode       ENUM('single','multiple') NOT NULL,
  subjects_json      JSON NOT NULL,                     -- array of subjects with optional details
  exam_conducted_on  DATE NULL,                         -- when that exam happened
  resource_url       VARCHAR(1000) NOT NULL,            -- URL to photos/pdf/doc
  notes              TEXT NULL,                         -- optional free text
  uploaded_by        BIGINT NOT NULL,                   -- FK to users.user_id
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pqs_course (course),
  INDEX idx_pqs_exam_date (exam_conducted_on),
  INDEX idx_pqs_uploader (uploaded_by),
  CONSTRAINT fk_pqs_user 
    FOREIGN KEY (uploaded_by) 
    REFERENCES examhubdb.users(user_id) 
    ON DELETE RESTRICT
) ENGINE=InnoDB;


-- Grab two existing users (adjust ORDER BY to whatever makes sense for you)
SET @u1 := (SELECT user_id FROM examhubdb.users ORDER BY user_id LIMIT 1);
SET @u2 := (SELECT user_id FROM examhubdb.users ORDER BY user_id LIMIT 1 OFFSET 1);

-- Insert first row only if @u1 exists
INSERT INTO examhubdb.previous_question_sets
(course, subject_mode, subjects_json, exam_conducted_on, resource_url, notes, uploaded_by)
SELECT 'IIT','multiple',
       JSON_ARRAY(JSON_OBJECT('name','Physics'), JSON_OBJECT('name','Chemistry')),
       '2024-12-10',
       'https://jeeadv.ac.in/past_qps/2025_1_English.pdf',
       'IIT mock from local institute',
       @u1
WHERE @u1 IS NOT NULL;

-- Insert second row only if @u2 exists (if you have only one user, skip this)
INSERT INTO examhubdb.previous_question_sets
(course, subject_mode, subjects_json, exam_conducted_on, resource_url, notes, uploaded_by)
SELECT 'NEET','single',
       JSON_ARRAY(JSON_OBJECT('name','Biology','chapter','Human Physiology')),
       '2025-01-05',
       'https://jeeadv.ac.in/past_qps/2024_1_English.pdf',
       'From Telegram group',
       @u2
WHERE @u2 IS NOT NULL;

--set_type column in exams to store set numbers for realtime exams
ALTER TABLE exams
ADD COLUMN set_type VARCHAR(50) NULL AFTER category;

-- Prevent duplicate set for the same group (title+date+category)
ALTER TABLE exams
ADD UNIQUE KEY uq_exam_set_group (title, start_date, category, set_type);