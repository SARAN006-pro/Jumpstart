-- Monthly AI-planned schedule (multi-roadmap)
CREATE TABLE monthly_plans (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT       NOT NULL,
    month_key        VARCHAR(7)   NOT NULL,
    date             DATE         NOT NULL,
    task_title       VARCHAR(300) NOT NULL,
    topic_id         BIGINT       NULL,
    topic_title      VARCHAR(200) NULL,
    roadmap_id       BIGINT       NULL,
    roadmap_title    VARCHAR(200) NULL,
    roadmap_color    VARCHAR(20)  NULL,
    estimated_minutes INT        NOT NULL DEFAULT 30,
    sort_order       INT          NOT NULL DEFAULT 0,
    status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    difficulty       VARCHAR(20)  NOT NULL DEFAULT 'BEGINNER',
    created_at       DATETIME(6)  NOT NULL,
    updated_at       DATETIME(6)  NOT NULL,

    INDEX idx_monthly_plans_user_month (user_id, month_key),
    INDEX idx_monthly_plans_user_date (user_id, date),
    CONSTRAINT fk_monthly_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
