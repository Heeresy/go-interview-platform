-- Performance indexes for GO Interview Platform
-- Added: 2026-04-18

-- 1. Composite index for question_answers user queries (N+1 fix)
CREATE INDEX IF NOT EXISTS idx_question_answers_user_date
ON public.question_answers(user_id, created_at DESC);

-- 2. Composite index for task_submissions user queries (N+1 fix)
CREATE INDEX IF NOT EXISTS idx_task_submissions_user_date
ON public.task_submissions(user_id, created_at DESC);

-- 3. Composite index for questions filtering
CREATE INDEX IF NOT EXISTS idx_questions_category_difficulty
ON public.questions(category_id, difficulty)
WHERE category_id IS NOT NULL;

-- 4. Composite index for tasks filtering
CREATE INDEX IF NOT EXISTS idx_tasks_category_difficulty
ON public.tasks(category_id, difficulty)
WHERE category_id IS NOT NULL;

-- 5. Atomic increment function for user_progress (prevents lock contention)
CREATE OR REPLACE FUNCTION public.increment_user_progress(
    p_user_id UUID,
    p_questions_answered INT DEFAULT 0,
    p_questions_correct INT DEFAULT 0,
    p_tasks_completed INT DEFAULT 0
) RETURNS public.user_progress AS $$
DECLARE
    v_result public.user_progress;
BEGIN
    UPDATE public.user_progress
    SET
        questions_answered = questions_answered + p_questions_answered,
        questions_correct = questions_correct + p_questions_correct,
        tasks_completed = tasks_completed + p_tasks_completed,
        last_active_at = now()
    WHERE user_id = p_user_id
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Index for mock_set_ratings lookup
CREATE INDEX IF NOT EXISTS idx_mock_set_ratings_set
ON public.mock_set_ratings(mock_set_id, rating DESC);

-- 7. Index for user_progress streak calculation
CREATE INDEX IF NOT EXISTS idx_user_progress_streak
ON public.user_progress(user_id, last_active_at DESC);

COMMENT ON FUNCTION public.increment_user_progress IS 'Atomically increment user progress counters to avoid lock contention';
