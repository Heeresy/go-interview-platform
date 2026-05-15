import { NextResponse } from 'next/server'
import { evaluateAnswer } from "@/lib/ai"
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
    const rateLimit = checkRateLimit(request, {
        key: 'api:evaluate',
        limit: 20,
        windowMs: 60_000,
    })
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit)

    try {
        const { question, reference_answer, user_answer } = await request.json()

        if (!question || !user_answer) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const result = await evaluateAnswer(question, reference_answer, user_answer)

        return NextResponse.json({
            score: result.score,
            feedback: result.feedback,
            is_correct: result.score >= 85,
        })
    } catch (error) {
        console.error('Evaluation error:', error)
        return NextResponse.json(
            { error: 'Failed to evaluate answer', score: 0, feedback: 'Сервис временно недоступен.' },
            { status: 500 }
        )
    }
}
