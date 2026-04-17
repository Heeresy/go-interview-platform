import { NextResponse } from 'next/server'
import { executeGoCode } from '@/lib/piston'

export async function POST(request: Request) {
    try {
        const { code, test_cases, time_limit_ms, memory_limit_mb } = await request.json()

        if (!code || !test_cases?.length) {
            return NextResponse.json(
                { error: 'Missing code or test cases' },
                { status: 400 }
            )
        }

        const result = await executeGoCode(code, test_cases, {
            timeLimitMs: time_limit_ms,
            memoryLimitMb: memory_limit_mb,
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('Code execution error:', error)
        return NextResponse.json(
            {
                status: 'error',
                results: { passed: 0, total: 0, details: [] },
                executionTimeMs: 0,
                stderr: 'Сервис выполнения кода временно недоступен.',
            },
            { status: 500 }
        )
    }
}
