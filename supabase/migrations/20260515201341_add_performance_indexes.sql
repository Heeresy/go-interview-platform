-- Performance indexes for GO Interview Platform.
-- Keep this migration aligned with 20260417080000_initial_schema.sql.

-- Question and task listing/filtering.
CREATE INDEX IF NOT EXISTS idx_questions_category_difficulty_created
ON public.questions(category_id, difficulty, created_at DESC)
WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_category_difficulty_created
ON public.tasks(category_id, difficulty, created_at DESC)
WHERE category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_created
ON public.tasks(created_at DESC);

-- User-owned rows and RLS lookups.
CREATE INDEX IF NOT EXISTS idx_question_answers_user_question
ON public.question_answers(user_id, question_id);

CREATE INDEX IF NOT EXISTS idx_task_submissions_user_task
ON public.task_submissions(user_id, task_id);

CREATE INDEX IF NOT EXISTS idx_mock_sets_created_by
ON public.mock_sets(created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mock_set_ratings_user
ON public.mock_set_ratings(user_id, created_at DESC);

-- Mock set discovery.
CREATE INDEX IF NOT EXISTS idx_mock_sets_published_rating
ON public.mock_sets(is_published, avg_rating DESC, created_at DESC);

-- Atomic increment helper for user_progress counters.
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

COMMENT ON FUNCTION public.increment_user_progress IS 'Atomically increment user progress counters to avoid lock contention';
