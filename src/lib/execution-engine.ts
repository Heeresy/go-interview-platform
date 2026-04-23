import type { TestCase, TestResults, TestResultDetail } from '@/types/database'

// --- JDoodle Configuration ---
const JDOODLE_CLIENT_ID = process.env.JDOODLE_CLIENT_ID
const JDOODLE_CLIENT_SECRET = process.env.JDOODLE_CLIENT_SECRET
const JDOODLE_URL = 'https://api.jdoodle.com/v1/execute'

// --- Glot.io Configuration ---
const GLOT_TOKEN = process.env.GLOT_TOKEN
const GLOT_URL = 'https://run.glot.io/languages/go/latest'

interface JdoodleResult {
    output: string
    statusCode: number
    memory: string | null
    cpuTime: string | null
}

interface GlotResult {
    stdout: string
    stderr: string
    error: string
}

/**
 * Execute code using JDoodle (Primary)
 */
async function runJDoodle(code: string, stdin: string): Promise<{ stdout: string; stderr: string; error?: string }> {
    if (!JDOODLE_CLIENT_ID || !JDOODLE_CLIENT_SECRET || JDOODLE_CLIENT_ID === 'your_id') {
        throw new Error('JDoodle credentials missing')
    }

    const res = await fetch(JDOODLE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            clientId: JDOODLE_CLIENT_ID,
            clientSecret: JDOODLE_CLIENT_SECRET,
            script: code,
            stdin: stdin,
            language: 'go',
            versionIndex: '4', // Go 1.18+
        }),
    })

    if (!res.ok) throw new Error(`JDoodle API failed: ${res.status}`)
    const data: JdoodleResult = await res.json()

    // JDoodle combines stdout and stderr in 'output'
    if (data.statusCode !== 200 && data.statusCode !== 201) {
        return { stdout: '', stderr: data.output, error: `Exit code ${data.statusCode}` }
    }

    return { stdout: data.output, stderr: '' }
}

/**
 * Execute code using Glot.io (Fallback)
 */
async function runGlot(code: string, stdin: string): Promise<{ stdout: string; stderr: string; error?: string }> {
    if (!GLOT_TOKEN || GLOT_TOKEN === 'your_token') {
        throw new Error('Glot.io token missing')
    }

    const res = await fetch(GLOT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${GLOT_TOKEN}`,
        },
        body: JSON.stringify({
            files: [{ name: 'main.go', content: code }],
            stdin: stdin,
        }),
    })

    if (!res.ok) throw new Error(`Glot.io API failed: ${res.status}`)
    const data: GlotResult = await res.json()

    return {
        stdout: data.stdout,
        stderr: data.stderr,
        error: data.error,
    }
}

/**
 * Unified execution with failover
 */
async function executeBatch(code: string, stdin: string) {
    try {
        // Try JDoodle first
        return await runJDoodle(code, stdin)
    } catch {
        console.warn('JDoodle failed, falling back to Glot.io')
        try {
            // Fallback to Glot.io
            return await runGlot(code, stdin)
        } catch {
            console.error('All execution services failed')
            throw new Error('Все сервисы выполнения кода недоступны. Проверьте API ключи в .env.local')
        }
    }
}

export async function executeGoCode(
    code: string,
    testCases: TestCase[],
    options?: {
        timeLimitMs?: number
        memoryLimitMb?: number
    }
): Promise<{
    status: 'passed' | 'failed' | 'error'
    results: TestResults
    executionTimeMs: number
    stderr?: string
}> {
    // Suppress unused warning while keeping signature for API compatibility
    if (process.env.NODE_ENV === 'development') {
        console.debug('[ExecutionEngine] Options ignored for now:', options)
    }
    const details: TestResultDetail[] = []
    let totalTimeMs = 0
    let hasError = false

    // If no test cases, perform a simple run to show output
    const casesToRun = testCases.length > 0 ? testCases : [{ input: '', expected_output: '' }]
    const isSingleRunOnly = testCases.length === 0

    for (const testCase of casesToRun) {
        const startTime = Date.now()

        try {
            const result = await executeBatch(code, testCase.input)

            const execTime = Date.now() - startTime
            totalTimeMs += execTime

            const actual = (result.stdout || '').trim()
            const expected = testCase.expected_output.trim()

            const isExecutionError = !!result.error || !!result.stderr
            const passed = !isExecutionError && (isSingleRunOnly || actual === expected)

            details.push({
                input: testCase.input,
                expected,
                actual: isExecutionError ? (result.stderr || result.error || '') : actual,
                passed,
                execution_time_ms: execTime,
            })

            if (isExecutionError) {
                hasError = true
            }
        } catch (err) {
            details.push({
                input: testCase.input,
                expected: testCase.expected_output.trim(),
                actual: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
                passed: false,
            })
            hasError = true
            totalTimeMs += Date.now() - startTime
        }
    }

    const passedCount = details.filter(d => d.passed).length

    return {
        status: hasError ? 'error' : (isSingleRunOnly || passedCount === testCases.length) ? 'passed' : 'failed',
        results: {
            passed: isSingleRunOnly ? (hasError ? 0 : 1) : passedCount,
            total: isSingleRunOnly ? 1 : testCases.length,
            details,
        },
        executionTimeMs: totalTimeMs,
        stderr: details.find(d => !d.passed)?.actual,
    }
}
