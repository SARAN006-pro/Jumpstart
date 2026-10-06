-- V18__goal_prerequisites.sql
-- Adds prerequisite goal dependency fields for sequential unlocking

ALTER TABLE goals ADD COLUMN prerequisite_goal_id BIGINT NULL;
ALTER TABLE goals ADD COLUMN unlock_threshold DOUBLE NULL;
ALTER TABLE goals ADD CONSTRAINT fk_goals_prerequisite FOREIGN KEY (prerequisite_goal_id) REFERENCES goals(id) ON DELETE SET NULL;
CREATE INDEX idx_goals_prerequisite ON goals (prerequisite_goal_id);
