ALTER TABLE study_sessions
    ADD COLUMN pomodoro_count      INT         NOT NULL DEFAULT 0 AFTER note,
    ADD COLUMN is_ai_generated     BOOLEAN     NOT NULL DEFAULT FALSE AFTER pomodoro_count,
    ADD COLUMN confirmation_status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' AFTER is_ai_generated;

CREATE INDEX idx_sessions_ai_confirmation
    ON study_sessions (owner_id, is_ai_generated, confirmation_status);
