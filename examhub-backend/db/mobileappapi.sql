--Registration (Sign Up)
ALTER TABLE users
  ADD COLUMN mobile VARCHAR(20) UNIQUE,
  ADD COLUMN parent_name VARCHAR(100),
  ADD COLUMN parent_mobile VARCHAR(20),
  ADD COLUMN education_level VARCHAR(50),
  ADD COLUMN country VARCHAR(100),
  ADD COLUMN city VARCHAR(100),
  ADD COLUMN address TEXT,
  ADD COLUMN dob DATE,
  ADD COLUMN profile_image VARCHAR(255);

--recommended videos (like tutorials, tips, preparation guides)
CREATE TABLE videos (
  video_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url VARCHAR(1000) NOT NULL,
  thumbnail_url VARCHAR(1000),
  exam_type ENUM('IIT','NEET','ALL') DEFAULT 'ALL', -- optional filter
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for exam_type filter
CREATE INDEX idx_videos_exam_type ON videos(exam_type);

INSERT INTO videos (title, description, video_url, thumbnail_url, exam_type) VALUES
('IIT-JEE Preparation Tips', 'Strategies for effective JEE study', 'https://example.com/video1', 'https://images.pexels.com/photos/5905709/pexels-photo-5905709.jpeg', 'IIT'),
('NEET Biology Crash Course', 'Quick revision of Human Physiology', 'https://example.com/video2', 'https://images.pexels.com/photos/5428836/pexels-photo-5428836.jpeg', 'NEET'),
('General Study Habits', 'Improve your concentration and time management', 'https://example.com/video3', 'https://images.pexels.com/photos/5965592/pexels-photo-5965592.jpeg', 'ALL');


-- exams table changes
ALTER TABLE exams
  ADD COLUMN price_type ENUM('free','paid') DEFAULT 'free',
  ADD COLUMN price_amount DECIMAL(10,2) DEFAULT 0;

  --student_answers table (to store actual responses):
  CREATE TABLE student_answers (
  answer_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  student_exam_id BIGINT NOT NULL,
  question_id BIGINT NOT NULL,
  selected_option_ids JSON, -- for MCQ (can be array)
  answer_text TEXT,         -- for descriptive/numerical
  is_correct BOOLEAN,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_exam_id) REFERENCES student_exams(student_exam_id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
);
