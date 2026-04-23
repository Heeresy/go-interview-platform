import { NextResponse } from 'next/server'
import { chatCompletion } from '@/lib/ai'

export async function GET() {
    const results = {
        timestamp: new Date().toISOString(),
        env: {
            hasApiKey: !!process.env.GOOGLE_AI_API_KEY,
            apiKeyLength: process.env.GOOGLE_AI_API_KEY?.length || 0,
            apiKeyPrefix: process.env.GOOGLE_AI_API_KEY?.substring(0, 8) + '...' || 'none',
        },
        tests: [] as any[],
    }

    // Test 1: Simple Gemini call via our library
    try {
        console.log('[Test AI] Starting Gemini 3.1 Flash Lite Preview test...')
        const response = await chatCompletion(
            [{ role: 'user', content: 'Скажи "Привет от Gemini 3.1 Preview" на русском' }],
            { temperature: 0.7 }
        )

        results.tests.push({
            name: 'Gemini 3.1 Flash Lite Test',
            success: true,
            content: response,
        })
    } catch (error) {
        console.error('[Test AI] Gemini test failed:', error)
        results.tests.push({
            name: 'Gemini 3.1 Flash Lite Test',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        })
    }

    return NextResponse.json(results)
}
