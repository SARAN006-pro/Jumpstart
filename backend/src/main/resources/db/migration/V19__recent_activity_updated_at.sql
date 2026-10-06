-- V19__recent_activity_updated_at.sql
-- Adds missing updated_at column so Hibernate can map Auditable

ALTER TABLE recent_activity ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
