-- MySQL-compatible database schema and data insertion for ExamHub admin panel
-- Supports all 8 components: Sidebar, ResultsAnalysis, StudentManagement, Settings, HelpSupport, AnnouncementsMedia, Dashboard, ExamManagement
-- Generated on 2025-08-02 for MySQL

-- Create Database
CREATE DATABASE IF NOT EXISTS ExamHubDB;
USE ExamHubDB;

-- Drop tables if they exist to ensure clean setup
DROP TABLE IF EXISTS student_exam_subjects;
DROP TABLE IF EXISTS question_options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS exam_subjects;
DROP TABLE IF EXISTS student_exams;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS support_tickets;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS guides;
DROP TABLE IF EXISTS videos;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS users;

-- 1. Users Table
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(10) UNIQUE, -- Custom ID for StudentManagement.tsx (e.g., S001)
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role ENUM('student', 'admin') NOT NULL,
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Exams Table
CREATE TABLE exams (
    exam_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    exam_type ENUM('IIT', 'NEET') NOT NULL,
    exam_format ENUM('single', 'comprehensive') NOT NULL DEFAULT 'single',
    total_marks INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    start_date DATE NOT NULL,
    start_time TIME NOT NULL,
    venue VARCHAR(100) DEFAULT 'Online Platform',
    status ENUM('scheduled', 'active', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Exam Subjects Table
CREATE TABLE exam_subjects (
    exam_subject_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    exam_id BIGINT NOT NULL,
    subject ENUM('Physics', 'Chemistry', 'Mathematics', 'Biology') NOT NULL,
    marks INTEGER NOT NULL,
    UNIQUE (exam_id, subject),
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE
);

-- 4. Questions Table
CREATE TABLE questions (
    question_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    exam_id BIGINT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('mcq', 'descriptive', 'numerical') NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
    marks INTEGER NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE
);

-- 5. Question Options Table
CREATE TABLE question_options (
    option_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    question_id BIGINT NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    option_order INTEGER NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(question_id) ON DELETE CASCADE
);

-- 6. Student Exams Table
CREATE TABLE student_exams (
    student_exam_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    exam_id BIGINT NOT NULL,
    score INTEGER,
    percentage DECIMAL(5,2),
    completed_at TIMESTAMP,
    status ENUM('registered', 'in_progress', 'completed', 'absent') NOT NULL DEFAULT 'registered',
    UNIQUE (user_id, exam_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE
);

-- 7. Student Exam Subjects Table (for ResultsAnalysis.tsx subject-wise scores)
CREATE TABLE student_exam_subjects (
    student_exam_subject_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_exam_id BIGINT NOT NULL,
    exam_subject_id BIGINT NOT NULL,
    score INTEGER,
    percentage DECIMAL(5,2),
    FOREIGN KEY (student_exam_id) REFERENCES student_exams(student_exam_id) ON DELETE CASCADE,
    FOREIGN KEY (exam_subject_id) REFERENCES exam_subjects(exam_subject_id) ON DELETE CASCADE
);

-- 8. Announcements Table
CREATE TABLE announcements (
    announcement_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    announcement_type ENUM('announcement', 'poster', 'video') NOT NULL,
    media_url VARCHAR(255),
    video_url VARCHAR(255),
    priority ENUM('high', 'medium', 'low') NOT NULL,
    target_audience ENUM('All Students', 'IIT Students', 'NEET Students') NOT NULL,
    status ENUM('active', 'scheduled', 'expired', 'draft') NOT NULL DEFAULT 'active',
    views INTEGER NOT NULL DEFAULT 0,
    created_at DATE NOT NULL,
    expires_at DATE,
    created_by BIGINT,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 9. Settings Table
CREATE TABLE settings (
    setting_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by BIGINT,
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 10. Support Tickets Table
CREATE TABLE support_tickets (
    ticket_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT,
    issue_type ENUM('Technical Issue', 'Account Problem', 'Feature Request', 'Other') NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 11. FAQs Table (optional, for dynamic HelpSupport.tsx content)
CREATE TABLE faqs (
    faq_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category ENUM('General', 'Technical', 'Exam-Related') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Guides Table (optional, for dynamic HelpSupport.tsx content)
CREATE TABLE guides (
    guide_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category ENUM('Exam Preparation', 'Platform Usage') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Videos Table (optional, for dynamic HelpSupport.tsx content)
CREATE TABLE videos (
    video_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    video_url VARCHAR(255) NOT NULL,
    thumbnail_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Updated DB schema: Add subjects table after the videos table

CREATE TABLE subjects (
    subject_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    exam_type ENUM('IIT', 'NEET') NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);



-- Create Indexes for Performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_exams_status ON exams(status);
CREATE INDEX idx_exam_subjects_exam_id ON exam_subjects(exam_id);
CREATE INDEX idx_questions_exam_id ON questions(exam_id);
CREATE INDEX idx_student_exams_user_id ON student_exams(user_id);
CREATE INDEX idx_student_exams_exam_id ON student_exams(exam_id);
CREATE INDEX idx_student_exam_subjects_student_exam_id ON student_exam_subjects(student_exam_id);
CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_subjects_exam_type ON subjects(exam_type);

-- Insert Sample Data

-- Sample data for subjects
INSERT INTO subjects (name, code, description, exam_type, is_active)
VALUES 
    ('Physics', 'PHY', 'Study of matter and energy', 'IIT', TRUE),
    ('Chemistry', 'CHEM', 'Study of substances and reactions', 'IIT', TRUE),
    ('Mathematics', 'MATH', 'Study of numbers and shapes', 'IIT', TRUE),
    ('Biology', 'BIO', 'Study of living organisms', 'NEET', TRUE),
    ('Physics', 'PHY_NEET', 'Physics for NEET', 'NEET', TRUE),
    ('Chemistry', 'CHEM_NEET', 'Chemistry for NEET', 'NEET', TRUE);
-- Insert Users (one admin, 10 students to support StudentManagement.tsx and Dashboard.tsx)
-- admin password is 'adminpass'
INSERT INTO users (student_id, username, email, password_hash, full_name, role, status)
VALUES 
    (NULL, 'admin1', 'admin1@examhub.com', '$2b$10$uFwkozwaZ3dV.edOuCWS1eK8WvUcNcrtCeEVO4lW4dsCKSYxssSOm', 'Admin One', 'admin', 'active'),
    ('S001', 'student1', 'student1@examhub.com', 'hashed_password_2', 'John Doe', 'student', 'active'),
    ('S002', 'student2', 'student2@examhub.com', 'hashed_password_3', 'Jane Smith', 'student', 'active'),
    ('S003', 'student3', 'student3@examhub.com', 'hashed_password_4', 'Alice Johnson', 'student', 'suspended'),
    ('S004', 'student4', 'student4@examhub.com', 'hashed_password_5', 'Bob Brown', 'student', 'active'),
    ('S005', 'student5', 'student5@examhub.com', 'hashed_password_6', 'Sarah Davis', 'student', 'active'),
    ('S006', 'student6', 'student6@examhub.com', 'hashed_password_7', 'Mike Wilson', 'student', 'active'),
    ('S007', 'student7', 'student7@examhub.com', 'hashed_password_8', 'Emily Taylor', 'student', 'active'),
    ('S008', 'student8', 'student8@examhub.com', 'hashed_password_9', 'David Lee', 'student', 'active'),
    ('S009', 'student9', 'student9@examhub.com', 'hashed_password_10', 'Lisa Anderson', 'student', 'active'),
    ('S010', 'student10', 'student10@examhub.com', 'hashed_password_11', 'Tom Clark', 'student', 'active');

-- Insert Exams (from ExamManagement.tsx and Dashboard.tsx)
INSERT INTO exams (title, exam_type, exam_format, total_marks, duration, start_date, start_time, venue, status, description)
VALUES 
    ('Physics Foundation Test', 'IIT', 'single', 300, 180, '2024-02-15', '09:00:00', 'Online Platform', 'scheduled', 'Physics foundation test for IIT students'),
    ('Mathematics Realtime Challenge', 'IIT', 'single', 200, 120, '2024-02-20', '14:00:00', 'Online Platform', 'scheduled', 'Real-time math challenge for IIT students'),
    ('Chemistry Moderate Assessment', 'IIT', 'single', 250, 150, '2024-02-25', '10:00:00', 'Online Platform', 'scheduled', 'Moderate chemistry assessment for IIT students'),
    ('IIT-JEE Mock Test 1', 'IIT', 'comprehensive', 300, 180, '2025-01-15', '09:00:00', 'Online Platform', 'active', 'Mock test for IIT-JEE preparation'),
    ('NEET Biology Chapter 1', 'NEET', 'single', 200, 120, '2025-01-14', '10:00:00', 'Online Platform', 'completed', 'Biology chapter 1 test for NEET students'),
    ('IIT Physics Mechanics', 'IIT', 'single', 250, 150, '2025-01-13', '11:00:00', 'Online Platform', 'active', 'Physics mechanics test for IIT students'),
    ('NEET Chemistry Organic', 'NEET', 'single', 200, 120, '2025-01-12', '14:00:00', 'Online Platform', 'completed', 'Organic chemistry test for NEET students');

-- Insert Exam Subjects
INSERT INTO exam_subjects (exam_id, subject, marks)
VALUES 
    (1, 'Physics', 300),
    (2, 'Mathematics', 200),
    (3, 'Chemistry', 250),
    (4, 'Physics', 100),
    (4, 'Chemistry', 100),
    (4, 'Mathematics', 100),
    (5, 'Biology', 200),
    (6, 'Physics', 250),
    (7, 'Chemistry', 200);

-- Insert Questions (from ExamManagement.tsx, first exam only)
INSERT INTO questions (exam_id, question_text, question_type, difficulty, marks, explanation)
VALUES 
    (1, 'What is the acceleration due to gravity on Earth?', 'mcq', 'easy', 4, NULL),
    (1, 'Derive the equation for kinetic energy.', 'descriptive', 'medium', 10, NULL);

-- Insert Question Options
INSERT INTO question_options (question_id, option_text, is_correct, option_order)
VALUES 
    (1, '9.8 m/s²', TRUE, 0),
    (1, '10 m/s²', FALSE, 1),
    (1, '8.9 m/s²', FALSE, 2),
    (1, '11 m/s²', FALSE, 3);

-- Insert Student Exams (based on participant counts)
INSERT INTO student_exams (user_id, exam_id, score, percentage, completed_at, status)
VALUES 
    -- Physics Foundation Test (456 participants, sample for 5 students)
    (2, 1, 240, 80.00, NULL, 'registered'),
    (3, 1, 225, 75.00, NULL, 'registered'),
    (4, 1, 255, 85.00, NULL, 'registered'),
    (5, 1, 210, 70.00, NULL, 'registered'),
    (6, 1, 230, 76.67, NULL, 'registered'),
    -- Mathematics Realtime Challenge (234 participants, sample for 4 students)
    (2, 2, 160, 80.00, NULL, 'registered'),
    (4, 2, 150, 75.00, NULL, 'registered'),
    (7, 2, 170, 85.00, NULL, 'registered'),
    (8, 2, 140, 70.00, NULL, 'registered'),
    -- Chemistry Moderate Assessment (189 participants, sample for 3 students)
    (3, 3, 200, 80.00, NULL, 'registered'),
    (5, 3, 190, 76.00, NULL, 'registered'),
    (9, 3, 210, 84.00, NULL, 'registered'),
    -- IIT-JEE Mock Test 1 (456 participants, sample for 5 students)
    (2, 4, 270, 90.00, '2025-01-15 12:00:00', 'completed'),
    (5, 4, 255, 85.00, '2025-01-15 12:00:00', 'completed'),
    (6, 4, 240, 80.00, '2025-01-15 12:00:00', 'completed'),
    (8, 4, 225, 75.00, '2025-01-15 12:00:00', 'completed'),
    (10, 4, 260, 86.67, '2025-01-15 12:00:00', 'completed'),
    -- NEET Biology Chapter 1 (234 participants, sample for 4 students)
    (3, 5, 180, 90.00, '2025-01-14 13:00:00', 'completed'),
    (4, 5, 170, 85.00, '2025-01-14 13:00:00', 'completed'),
    (7, 5, 160, 80.00, '2025-01-14 13:00:00', 'completed'),
    (9, 5, 175, 87.50, '2025-01-14 13:00:00', 'completed'),
    -- IIT Physics Mechanics (187 participants, sample for 3 students)
    (2, 6, 200, 80.00, NULL, 'in_progress'),
    (6, 6, 190, 76.00, NULL, 'in_progress'),
    (8, 6, 210, 84.00, NULL, 'in_progress'),
    -- NEET Chemistry Organic (298 participants, sample for 4 students)
    (3, 7, 160, 80.00, '2025-01-12 17:00:00', 'completed'),
    (5, 7, 150, 75.00, '2025-01-12 17:00:00', 'completed'),
    (7, 7, 165, 82.50, '2025-01-12 17:00:00', 'completed'),
    (10, 7, 170, 85.00, '2025-01-12 17:00:00', 'completed');

-- Insert Student Exam Subjects (sample for IIT-JEE Mock Test 1, exam_id=4)
INSERT INTO student_exam_subjects (student_exam_id, exam_subject_id, score, percentage)
VALUES 
    -- Student 2 (student_exam_id=13)
    (13, 4, 90, 90.00), -- Physics
    (13, 5, 85, 85.00), -- Chemistry
    (13, 6, 95, 95.00), -- Mathematics
    -- Student 5 (student_exam_id=14)
    (14, 4, 85, 85.00), -- Physics
    (14, 5, 80, 80.00), -- Chemistry
    (14, 6, 90, 90.00); -- Mathematics

-- Insert Announcements (from AnnouncementsMedia.tsx)
INSERT INTO announcements (title, content, announcement_type, media_url, video_url, priority, target_audience, status, views, created_at, expires_at, created_by)
VALUES 
    ('IIT-JEE 2025 Registration Open', 'Registration for IIT-JEE 2025 is now open. Don''t miss the deadline!', 'poster', 'https://images.pexels.com/photos/5905709/pexels-photo-5905709.jpeg', NULL, 'high', 'IIT Students', 'active', 1250, '2025-01-15', '2025-03-15', 1),
    ('NEET Biology Masterclass', 'Join our expert faculty for an exclusive biology masterclass covering important topics.', 'video', 'https://images.pexels.com/photos/5428836/pexels-photo-5428836.jpeg', 'https://example.com/video1', 'medium', 'NEET Students', 'active', 890, '2025-01-14', '2025-02-14', 1),
    ('Important Notice: Exam Schedule Update', 'Please note the updated exam schedule for this month. Check your dashboard for details.', 'announcement', NULL, NULL, 'high', 'All Students', 'active', 2100, '2025-01-13', '2025-01-25', 1),
    ('Physics Workshop Series', 'Interactive physics workshop series starting next week. Limited seats available.', 'poster', 'https://images.pexels.com/photos/5965592/pexels-photo-5965592.jpeg', NULL, 'medium', 'IIT Students', 'scheduled', 567, '2025-01-12', '2025-02-12', 1),
    ('Study Tips for Success', 'Learn effective study techniques from our top performers.', 'video', 'https://images.pexels.com/photos/5905888/pexels-photo-5905888.jpeg', 'https://example.com/video2', 'low', 'All Students', 'active', 445, '2025-01-11', '2025-03-11', 1);

-- Insert Settings (from Settings.tsx)
INSERT INTO settings (setting_key, setting_value, updated_by)
VALUES 
    ('backup_frequency', '{"value": "weekly"}', 1),
    ('notifications', '{"email": true, "sms": false}', 1),
    ('authentication', '{"method": "OAuth"}', 1);

-- Insert Support Tickets (sample for HelpSupport.tsx contact form)
INSERT INTO support_tickets (user_id, issue_type, description, status)
VALUES 
    (1, 'Technical Issue', 'Unable to access exam results dashboard', 'open'),
    (1, 'Feature Request', 'Add export to PDF for student results', 'open');

-- Insert FAQs (from HelpSupport.tsx,  dynamic content)
INSERT INTO faqs (question, answer, category)
VALUES 
    ('How do I reset my password?', 'Go to the login page and click "Forgot Password" to receive a reset link.', 'General'),
    ('What is the exam format?', 'Exams can be single-subject or comprehensive, covering multiple subjects.', 'Exam-Related'),
    ('How to contact support?', 'Use the contact form in the Help & Support section.', 'Technical');

-- Insert Guides (from HelpSupport.tsx,  dynamic content)
INSERT INTO guides (title, content, category)
VALUES 
    ('How to Navigate the Dashboard', 'This guide explains how to use the dashboard to view exam schedules and results.', 'Platform Usage'),
    ('Preparing for IIT-JEE', 'Tips and strategies for effective IIT-JEE preparation.', 'Exam Preparation');

-- Insert Videos (from HelpSupport.tsx,  dynamic content)
INSERT INTO videos (title, video_url, thumbnail_url)
VALUES 
    ('Introduction to ExamHub', 'https://example.com/intro-video', 'https://images.pexels.com/photos/5428836/pexels-photo-5428836.jpeg'),
    ('IIT-JEE Preparation Tips', 'https://example.com/iit-jee-tips', 'https://images.pexels.com/photos/5905709/pexels-photo-5905709.jpeg');