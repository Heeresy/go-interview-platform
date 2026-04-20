import { NextResponse } from 'next/server'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    env: {
      hasApiKey: !!process.env.OPENROUTER_API_KEY,
      apiKeyLength: process.env.OPENROUTER_API_KEY?.length || 0,
      apiKeyPrefix: process.env.OPENROUTER_API_KEY?.substring(0, 10) + '...' || 'none',
      hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'not set',
    },
    tests: [] as any[],
  }

  // Test 1: Simple API call
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'GO Interview Platform Test',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [
          { role: 'user', content: 'Say "Hello from OpenRouter" in Russian' }
        ],
        max_tokens: 100,
      }),
    })

    const responseText = await response.text()

    results.tests.push({
      name: 'API Call',
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      responsePreview: responseText.substring(0, 500),
    })

    // Try to parse JSON if successful
    if (response.ok) {
      try {
        const data = JSON.parse(responseText)
        results.tests.push({
          name: 'Response Parsing',
          success: true,
          hasChoices: !!data.choices,
          choicesCount: data.choices?.length,
          content: data.choices?.[0]?.message?.content?.substring(0, 100),
        })
      } catch (parseError) {
        results.tests.push({
          name: 'Response Parsing',
          success: false,
          error: parseError instanceof Error ? parseError.message : 'Parse error',
        })
      }
    }
  } catch (error) {
    results.tests.push({
      name: 'API Call',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
    })
  }

  return NextResponse.json(results)
}
