export type Difficulty = 1 | 2 | 3 | 4 | 5

export interface Profile {
    id: string
    username: string | null
    avatar_url: string | null
    display_name: string | null
    created_at: string
    updated_at: string
}

export interface Category {
    id: string
    name: string
    slug: string
    icon: string | null
    sort_order: number
}

export interface Question {
    id: string
    category_id: string
    title: string
    description: string
    difficulty: Difficulty
    hint: string | null
    reference_answer: string | null
    created_by: string | null
    is_official: boolean
    created_at: string
    // Joined
    category?: Category
}

export interface QuestionAnswer {
    id: string
    user_id: string
    question_id: string
    answer_text: string
    ai_score: number | null
    is_correct: boolean | null
    ai_feedback: string | null
    created_at: string
}

export interface Task {
    id: string
    category_id: string
    title: string
    description: string
    difficulty: Difficulty
    starter_code: string | null
    solution: string | null
    test_cases: TestCase[]
    extended_test_cases: TestCase[] | null
    time_limit_ms: number
    memory_limit_mb: number
    created_by: string | null
    is_official: boolean
    created_at: string
    // Joined
    category?: Category
}

export interface TestCase {
    input: string
    expected_output: string
    description?: string
}

export interface TaskSubmission {
    id: string
    user_id: string
    task_id: string
    code: string
    status: 'pending' | 'running' | 'passed' | 'failed' | 'error'
    test_results: TestResults | null
    execution_time_ms: number | null
    created_at: string
}

export interface TestResults {
    passed: number
    total: number
    details: TestResultDetail[]
}

export interface TestResultDetail {
    input: string
    expected: string
    actual: string
    passed: boolean
    execution_time_ms?: number
}

export interface MockSet {
    id: string
    created_by: string
    title: string
    description: string | null
    question_ids: string[]
    task_ids: string[] | null
    difficulty: Difficulty
    avg_rating: number
    total_ratings: number
    is_published: boolean
    created_at: string
    // Joined
    author?: Profile
}

export interface MockSetRating {
    id: string
    user_id: string
    mock_set_id: string
    rating: number
    comment: string | null
    created_at: string
}

export interface UserProgress {
    id: string
    user_id: string
    current_trainer_level: number
    questions_answered: number
    questions_correct: number
    tasks_completed: number
    streak_days: number
    last_active_at: string
}

// API types
export interface AIEvaluationRequest {
    question: string
    reference_answer: string | null
    user_answer: string
}

export interface AIEvaluationResponse {
    score: number
    feedback: string
    is_correct: boolean
}

export interface CodeExecutionRequest {
    code: string
    test_cases: TestCase[]
    time_limit_ms?: number
    memory_limit_mb?: number
}

export interface CodeExecutionResponse {
    status: 'passed' | 'failed' | 'error'
    results: TestResults
    execution_time_ms: number
    stderr?: string
}

export interface AIChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
}

// Difficulty helpers
export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
    1: 'Лёгкий',
    2: 'Средний',
    3: 'Выше среднего',
    4: 'Сложный',
    5: 'Экспертный',
}

export const DIFFICULTY_COLORS: Record<Difficulty, string> = {
    1: 'easy',
    2: 'medium',
    3: 'medium',
    4: 'hard',
    5: 'expert',
}
