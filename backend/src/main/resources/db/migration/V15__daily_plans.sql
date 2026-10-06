-- Daily AI-planned schedule
CREATE TABLE daily_plans (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    date        DATE         NOT NULL,
    task_title  VARCHAR(300) NOT NULL,
    topic_id    BIGINT       NULL,
    topic_title VARCHAR(200) NULL,
    goal_id     BIGINT       NULL,
    goal_title  VARCHAR(200) NULL,
    estimated_minutes INT NOT NULL DEFAULT 30,
    sort_order  INT          NOT NULL DEFAULT 0,
    status      VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    difficulty  VARCHAR(20)  NOT NULL DEFAULT 'BEGINNER',
    created_at  DATETIME(6)  NOT NULL,
    updated_at  DATETIME(6)  NOT NULL,

    INDEX idx_daily_plans_user_date (user_id, date),
    CONSTRAINT fk_daily_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add availability column to user_settings
ALTER TABLE user_settings ADD COLUMN availability TEXT NULL AFTER daily_study_hours;
