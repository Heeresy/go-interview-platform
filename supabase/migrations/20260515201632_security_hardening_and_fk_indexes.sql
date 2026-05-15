-- Security hardening and FK index coverage. Non-destructive.

-- Cover remaining foreign keys used by joins/deletes.
CREATE INDEX IF NOT EXISTS idx_question_answers_question
ON public.question_answers(question_id)
WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_created_by
ON public.questions(created_by)
WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_submissions_task
ON public.task_submissions(task_id)
WHERE task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_created_by
ON public.tasks(created_by)
WHERE created_by IS NOT NULL;

-- mock_set_ratings has RLS enabled; define owner/public read/write policies.
DROP POLICY IF EXISTS "Mock set ratings are viewable for published sets or owned rows" ON public.mock_set_ratings;
CREATE POLICY "Mock set ratings are viewable for published sets or owned rows" ON public.mock_set_ratings FOR
SELECT USING (
    (select auth.uid()) = user_id
    OR EXISTS (
        SELECT 1
        FROM public.mock_sets ms
        WHERE ms.id = mock_set_id
          AND ms.is_published = true
    )
);

DROP POLICY IF EXISTS "Users can insert own mock set ratings" ON public.mock_set_ratings;
CREATE POLICY "Users can insert own mock set ratings" ON public.mock_set_ratings FOR
INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own mock set ratings" ON public.mock_set_ratings;
CREATE POLICY "Users can update own mock set ratings" ON public.mock_set_ratings FOR
UPDATE USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own mock set ratings" ON public.mock_set_ratings;
CREATE POLICY "Users can delete own mock set ratings" ON public.mock_set_ratings FOR
DELETE USING ((select auth.uid()) = user_id);

-- Security definer functions should not be callable through public RPC.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.increment_user_progress(UUID, INT, INT, INT) SET search_path = public;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_user_progress(UUID, INT, INT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_user_progress(UUID, INT, INT, INT) TO service_role;
