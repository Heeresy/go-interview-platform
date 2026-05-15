-- Search and RLS performance improvements.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes support scalable ilike/search-as-you-type filters.
CREATE INDEX IF NOT EXISTS idx_questions_title_trgm
ON public.questions USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_questions_description_trgm
ON public.questions USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm
ON public.tasks USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_tasks_description_trgm
ON public.tasks USING gin (description gin_trgm_ops);

-- RLS policies: wrap auth.uid() in SELECT so Postgres can cache it per statement.
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR
INSERT WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR
UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "User can view own answers" ON public.question_answers;
CREATE POLICY "User can view own answers" ON public.question_answers FOR
SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "User can insert own answers" ON public.question_answers;
CREATE POLICY "User can insert own answers" ON public.question_answers FOR
INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "User can view own submissions" ON public.task_submissions;
CREATE POLICY "User can view own submissions" ON public.task_submissions FOR
SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "User can insert own submissions" ON public.task_submissions;
CREATE POLICY "User can insert own submissions" ON public.task_submissions FOR
INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Mock sets are viewable if published or owned" ON public.mock_sets;
CREATE POLICY "Mock sets are viewable if published or owned" ON public.mock_sets FOR
SELECT USING (
    is_published = true
    OR (select auth.uid()) = created_by
);

DROP POLICY IF EXISTS "User can insert own mock sets" ON public.mock_sets;
CREATE POLICY "User can insert own mock sets" ON public.mock_sets FOR
INSERT WITH CHECK ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "User can update own mock sets" ON public.mock_sets;
CREATE POLICY "User can update own mock sets" ON public.mock_sets FOR
UPDATE USING ((select auth.uid()) = created_by);

DROP POLICY IF EXISTS "User can view own progress" ON public.user_progress;
CREATE POLICY "User can view own progress" ON public.user_progress FOR
SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "User can update own progress" ON public.user_progress;
CREATE POLICY "User can update own progress" ON public.user_progress FOR
UPDATE USING ((select auth.uid()) = user_id);
