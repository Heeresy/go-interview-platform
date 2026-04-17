import type { TestCase, TestResults, TestResultDetail } from '@/types/database'

const PISTON_URL = 'https://emkc.org/api/v2/piston/execute'

interface PistonSubmission {
    language: string
    version: string
    files: { name: string; content: string }[]
    stdin: string
    run_timeout?: number
}

interface PistonResult {
    language: string
    version: string
    run: {
        stdout: string
        stderr: string
        code: number
        signal: string | null
        output: string
    }
    compile?: {
        stdout: string
        stderr: string
        code: number
        signal: string | null
        output: string
    }
}

async function submitCode(submission: PistonSubmission): Promise<PistonResult> {
    const res = await fetch(PISTON_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(submission),
    })

    if (!res.ok) {
        throw new Error(`Piston API submission failed: ${res.status}`)
    }

    return res.json()
}

export async function executeGoCode(
    code: string,
    testCases: TestCase[],
    options?: {
        timeLimitMs?: number
        memoryLimitMb?: number // Piston public API doesn't support memory limits directly but we will keep the signature
    }
): Promise<{
    status: 'passed' | 'failed' | 'error'
    results: TestResults
    executionTimeMs: number
    stderr?: string
}> {
    const timeLimitMs = options?.timeLimitMs || 5000

    const details: TestResultDetail[] = []
    let totalTimeMs = 0
    let hasError = false

    for (const testCase of testCases) {
        const startTime = Date.now()

        try {
            const result = await submitCode({
                language: 'go',
                version: '*',
                files: [{ name: 'main.go', content: code }],
                stdin: testCase.input,
                run_timeout: timeLimitMs,
            })

            const execTime = Date.now() - startTime
            totalTimeMs += execTime

            const isCompileError = result.compile && result.compile.code !== 0
            const isRunError = result.run.code !== 0

            const actual = result.run.stdout.trim()
            const expected = testCase.expected_output.trim()
            const passed = !isCompileError && !isRunError && actual === expected

            details.push({
                input: testCase.input,
                expected,
                actual: isCompileError
                    ? result.compile?.stderr || result.compile?.output || ''
                    : (result.run.stderr ? result.run.stderr : actual),
                passed,
                execution_time_ms: execTime,
            })

            if (isCompileError || isRunError) {
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
        status: hasError && passedCount === 0 ? 'error' : passedCount === testCases.length ? 'passed' : 'failed',
        results: {
            passed: passedCount,
            total: testCases.length,
            details,
        },
        executionTimeMs: totalTimeMs,
        stderr: details.find(d => !d.passed)?.actual,
    }
}
