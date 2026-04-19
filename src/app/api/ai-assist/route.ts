import { NextResponse } from 'next/server'
import { getAIHint } from '@/lib/openrouter'

export async function POST(request: Request) {
  console.log('[AI Assist] Request received')

  try {
    const body = await request.json()
    console.log('[AI Assist] Request body:', {
      context: body.context?.substring(0, 50),
      question: body.question?.substring(0, 50),
      historyLength: body.history?.length,
    })

    const { context, question, history } = body

    if (!question) {
      console.log('[AI Assist] Error: Missing question')
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    }

    // Check if API key is configured
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('[AI Assist] Error: OPENROUTER_API_KEY is not set')
      return NextResponse.json(
        {
          error: 'AI service not configured',
          response: 'AI помощник не настроен. Пожалуйста, обратитесь к администратору.',
        },
        { status: 500 }
      )
    }

    console.log('[AI Assist] Calling getAIHint...')
    const response = await getAIHint(context || '', question, history || [])
    console.log('[AI Assist] Response received:', response?.substring(0, 50))

    return NextResponse.json({ response })
  } catch (error) {
    console.error('[AI Assist] Error:', error)
    console.error('[AI Assist] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      name: error instanceof Error ? error.name : 'Unknown',
    })
    return NextResponse.json(
      {
        error: 'AI assistant is temporarily unavailable',
        response: 'Помощник временно недоступен. Попробуйте позже.',
      },
      { status: 500 }
    )
  }
}
