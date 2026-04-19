-- Migration: Add performance indexes for common queries
-- Date: 2026-04-18
-- Description: Optimize database query performance for user-facing features

-- Index for questions listing and filtering
CREATE INDEX IF NOT EXISTS idx_questions_difficulty
ON questions(difficulty);

CREATE INDEX IF NOT EXISTS idx_questions_category
ON questions(category);

CREATE INDEX IF NOT EXISTS idx_questions_difficulty_category
ON questions(difficulty, category);

-- Index for user progress tracking
CREATE INDEX IF NOT EXISTS idx_user_question_progress
ON user_question_progress(user_id, question_id);

CREATE INDEX IF NOT EXISTS idx_user_question_progress_score
ON user_question_progress(user_id, score DESC);

-- Index for tasks and executions
CREATE INDEX IF NOT EXISTS idx_task_executions_user
ON task_executions(user_id, task_id);

CREATE INDEX IF NOT EXISTS idx_task_executions_created
ON task_executions(user_id, created_at DESC);

-- Index for mock interview sets
CREATE INDEX IF NOT EXISTS idx_mock_sets_user
ON mock_interview_sets(created_by);

CREATE INDEX IF NOT EXISTS idx_mock_sets_rating
ON mock_interview_sets(average_rating DESC);

CREATE INDEX IF NOT EXISTS idx_mock_set_questions_set
ON mock_set_questions(mock_set_id);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_user
ON analytics_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type
ON analytics_events(event_name, created_at DESC);

-- Index for trainer progress
CREATE INDEX IF NOT EXISTS idx_trainer_progress_user
ON trainer_progress(user_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_questions_search
ON questions(difficulty, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_stats
ON user_question_progress(user_id, created_at DESC, score DESC);

-- VACUUM to clean up
VACUUM ANALYZE;

