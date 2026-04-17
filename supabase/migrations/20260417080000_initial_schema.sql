-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Users (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Handle new user tracking automatically
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO public.profiles (id, username, display_name, avatar_url)
VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'user_name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.raw_user_meta_data->>'avatar_url'
    );
-- Create initial track row
INSERT INTO public.user_progress (user_id)
VALUES (NEW.id);
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
-- Question categories
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    sort_order INT DEFAULT 0
);
-- Interview questions (open-ended)
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty INT CHECK (
        difficulty BETWEEN 1 AND 5
    ),
    hint TEXT,
    reference_answer TEXT,
    created_by UUID REFERENCES public.profiles(id),
    is_official BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- User answers to questions  
CREATE TABLE public.question_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id),
    answer_text TEXT NOT NULL,
    ai_score INT CHECK (
        ai_score BETWEEN 0 AND 100
    ),
    is_correct BOOLEAN GENERATED ALWAYS AS (ai_score >= 85) STORED,
    ai_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Coding tasks
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty INT CHECK (
        difficulty BETWEEN 1 AND 5
    ),
    starter_code TEXT,
    solution TEXT,
    test_cases JSONB NOT NULL,
    extended_test_cases JSONB,
    time_limit_ms INT DEFAULT 5000,
    memory_limit_mb INT DEFAULT 128,
    created_by UUID REFERENCES public.profiles(id),
    is_official BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Task submissions
CREATE TABLE public.task_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.tasks(id),
    code TEXT NOT NULL,
    status TEXT CHECK (
        status IN ('pending', 'running', 'passed', 'failed', 'error')
    ),
    test_results JSONB,
    execution_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- MOCK interview sets (community)
CREATE TABLE public.mock_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    question_ids UUID [] NOT NULL,
    task_ids UUID [],
    difficulty INT CHECK (
        difficulty BETWEEN 1 AND 5
    ),
    avg_rating NUMERIC(3, 2) DEFAULT 0,
    total_ratings INT DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Ratings for MOCK sets
CREATE TABLE public.mock_set_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    mock_set_id UUID REFERENCES public.mock_sets(id) ON DELETE CASCADE,
    rating INT CHECK (
        rating BETWEEN 1 AND 5
    ),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, mock_set_id)
);
-- User progress tracking
CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_trainer_level INT DEFAULT 1,
    questions_answered INT DEFAULT 0,
    questions_correct INT DEFAULT 0,
    tasks_completed INT DEFAULT 0,
    streak_days INT DEFAULT 0,
    last_active_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);
-- Indexes
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON public.tasks(difficulty);
CREATE INDEX IF NOT EXISTS idx_mock_sets_rating ON public.mock_sets(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_mock_sets_date ON public.mock_sets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_answers_user ON public.question_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_user ON public.task_submissions(user_id);
-- RLS POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_set_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
-- Everyone can view profiles, but only the user can update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR
SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR
INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR
UPDATE USING (auth.uid() = id);
-- Categories are public
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR
SELECT USING (true);
-- Questions/Tasks are public
CREATE POLICY "Questions are viewable by everyone" ON public.questions FOR
SELECT USING (true);
CREATE POLICY "Tasks are viewable by everyone" ON public.tasks FOR
SELECT USING (true);
-- Answers/Submissions only visible to the user who made them
CREATE POLICY "User can view own answers" ON public.question_answers FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own answers" ON public.question_answers FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can view own submissions" ON public.task_submissions FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can insert own submissions" ON public.task_submissions FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Mock sets are public if published, or if the user created it
CREATE POLICY "Mock sets are viewable if published or owned" ON public.mock_sets FOR
SELECT USING (
        is_published = true
        OR auth.uid() = created_by
    );
CREATE POLICY "User can insert own mock sets" ON public.mock_sets FOR
INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "User can update own mock sets" ON public.mock_sets FOR
UPDATE USING (auth.uid() = created_by);
-- Progress is private
CREATE POLICY "User can view own progress" ON public.user_progress FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "User can update own progress" ON public.user_progress FOR
UPDATE USING (auth.uid() = user_id);