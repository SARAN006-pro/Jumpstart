-- V20__create_schedule_sessions.sql
-- Create the schedule_sessions table referenced by ScheduleSession entity

CREATE TABLE IF NOT EXISTS schedule_sessions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  title VARCHAR(240) NOT NULL,
  topic_id BIGINT,
  resource_id BIGINT,
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
  planned_start_time DATETIME NOT NULL,
  planned_end_time DATETIME NOT NULL,
  actual_start_time DATETIME,
  actual_end_time DATETIME,
  actual_duration INT,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  recurrence_rule VARCHAR(500),
  original_series_id BIGINT,
  pomodoro_count INT NOT NULL DEFAULT 0,
  is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  confirmation_status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
  rating INT,
  notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL,
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_ss_user ON schedule_sessions (user_id);
CREATE INDEX idx_ss_user_status ON schedule_sessions (user_id, status);
CREATE INDEX idx_ss_planned_start ON schedule_sessions (planned_start_time);