-- 1) Add quiz category to exams
ALTER TABLE exams
  ADD COLUMN category ENUM('Easy','Moderate','Realtime') NOT NULL DEFAULT 'Easy';

-- 2) alter question_types 
ALTER TABLE questions
  MODIFY COLUMN question_type VARCHAR(50) NOT NULL;

-- (Optional but recommended) index for date filter performance
CREATE INDEX idx_exams_start_date ON exams(start_date);

-- Geo on users
ALTER TABLE users
  ADD COLUMN state VARCHAR(100),
  ADD COLUMN district VARCHAR(100);

--user roles and permissions
-- 1) Role catalog with embedded permission set
CREATE TABLE IF NOT EXISTS roles (
  role_id        BIGINT PRIMARY KEY AUTO_INCREMENT,
  name           VARCHAR(50) UNIQUE NOT NULL,
  description    VARCHAR(255),
  permissions    JSON NOT NULL,               -- e.g. ["users.read","users.write","exams.read"]
  is_system      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2) Per-user overrides (allow or deny specific permission keys)
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id        BIGINT NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  effect         ENUM('allow','deny') NOT NULL,  -- explicit grant or deny
  PRIMARY KEY (user_id, permission_key),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Helpful index if you will query by permission_key (e.g. audits/reports)
CREATE INDEX idx_user_permissions_key ON user_permissions(permission_key);

-- Optional: seed
INSERT INTO roles (name, description, permissions, is_system) VALUES
('Admin', 'Full access', JSON_ARRAY(
  'settings.write','roles.write','roles.read',
  'users.read','users.write',
  'exams.read','exams.write',
  'subjects.read','subjects.write',
  'announcements.write',
  'results.read'
), TRUE),
('Instructor', 'Manage exams & subjects', JSON_ARRAY(
  'users.read',
  'exams.read','exams.write',
  'subjects.read','subjects.write',
  'announcements.write',
  'results.read'
), TRUE),
('Student', 'Take exams, view own results', JSON_ARRAY(
  'exams.read','subjects.read','results.read'
), TRUE);
