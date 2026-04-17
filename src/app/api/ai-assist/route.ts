import { NextResponse } from 'next/server'
import { getAIHint } from '@/lib/openrouter'

export async function POST(request: Request) {
    try {
        const { context, question, history } = await request.json()

        if (!question) {
            return NextResponse.json(
                { error: 'Missing question' },
                { status: 400 }
            )
        }

        const response = await getAIHint(context || '', question, history || [])

        return NextResponse.json({ response })
    } catch (error) {
        console.error('AI assist error:', error)
        return NextResponse.json(
            { error: 'AI assistant is temporarily unavailable', response: 'Помощник временно недоступен. Попробуйте позже.' },
            { status: 500 }
        )
    }
}
