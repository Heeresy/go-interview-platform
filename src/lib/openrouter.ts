import type { AIChatMessage } from '@/types/database'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Available models on OpenRouter
// Note: Some :free suffixed models may still work
const AVAILABLE_MODELS = [
  'google/gemma-4-31b-it-20260402:free', // Working free model
  'nvidia/llama-3.1-nemotron-70b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct',
  'google/gemma-2-9b-it',
  'mistralai/mistral-7b-instruct',
  'openchat/openchat-7b',
  'huggingfaceh4/zephyr-7b-beta',
]

// Timeout in milliseconds
const REQUEST_TIMEOUT = 15000 // 15 seconds
const MAX_RETRIES = 2

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}

/**
 * Retry fetch with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[OpenRouter] Attempt ${attempt + 1}/${maxRetries + 1}`)
      const response = await fetchWithTimeout(url, options, REQUEST_TIMEOUT)

      // If successful, return immediately
      if (response.ok) {
        return response
      }

      // If rate limited, wait longer
      if (response.status === 429) {
        const delay = Math.pow(2, attempt) * 2000 // 2s, 4s, 8s
        console.log(`[OpenRouter] Rate limited, waiting ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // For other errors, throw and potentially retry
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      console.error(`[OpenRouter] Attempt ${attempt + 1} failed:`, lastError.message)

      // Don't retry on certain errors
      if (lastError.message.includes('not configured') || lastError.message.includes('API key')) {
        throw lastError
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
        console.log(`[OpenRouter] Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('All retry attempts failed')
}

export async function chatCompletion(
  messages: AIChatMessage[],
  options?: {
    model?: string
    maxTokens?: number
    temperature?: number
  }
) {
  // Check if API key is configured
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('[OpenRouter] API key is not configured')
    throw new Error('OpenRouter API key is not configured')
  }

  console.log('[OpenRouter] Messages count:', messages.length)

  // Try models in order until one works
  const modelsToTry = options?.model ? [options.model] : AVAILABLE_MODELS

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i]
    console.log(`[OpenRouter] Trying model ${i + 1}/${modelsToTry.length}: ${model}`)

    try {
      const response = await fetchWithRetry(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
          'X-Title': 'GO Interview Platform',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: options?.maxTokens || 1024,
          temperature: options?.temperature ?? 0.3,
        }),
      })

      console.log('[OpenRouter] Response status:', response.status)

      const data = await response.json()
      console.log('[OpenRouter] Response received, choices:', data.choices?.length)

      if (!data.choices || data.choices.length === 0) {
        console.error('[OpenRouter] No choices in response:', data)
        throw new Error('Empty response from AI')
      }

      return data.choices[0]?.message?.content || ''
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[OpenRouter] Model ${model} failed:`, errorMsg)

      // If this is the last model, throw the error
      if (i === modelsToTry.length - 1) {
        console.error('[OpenRouter] All models failed')
        throw error
      }

      // Otherwise try next model
      console.log('[OpenRouter] Trying next model...')
    }
  }

  throw new Error('All models failed')
}

export async function evaluateAnswer(
  question: string,
  referenceAnswer: string | null,
  userAnswer: string
): Promise<{ score: number; feedback: string }> {
  console.log('[OpenRouter] Evaluating answer for question:', question.substring(0, 50))

  const systemPrompt = `Ты — опытный технический интервьюер для Go-разработчиков. Твоя задача — оценить ответ кандидата на вопрос собеседования.

Оцени ответ по шкале от 0 до 100, где:
- 0-30: Ответ неверный или совсем не по теме
- 31-50: Частично верный, упущены ключевые моменты
- 51-70: В целом верный, но есть неточности
- 71-84: Хороший ответ с незначительными пробелами
- 85-100: Отличный, полный ответ

Ответь СТРОГО в формате JSON:
{
  "score": <число 0-100>,
  "feedback": "<подробный разбор ответа на русском: что хорошо, что можно улучшить>"
}`

  const userPrompt = `Вопрос: ${question}

${referenceAnswer ? `Эталонный ответ (для справки): ${referenceAnswer}\n` : ''}
Ответ кандидата: ${userAnswer}`

  try {
    const result = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.2 }
    )

    // Extract JSON from response
    const jsonMatch = result.match(/\{[\s\S]*?\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      console.log('[OpenRouter] Parsed evaluation:', { score: parsed.score })
      return {
        score: Math.max(0, Math.min(100, Math.round(parsed.score))),
        feedback: parsed.feedback || 'Нет комментария.',
      }
    }

    console.error('[OpenRouter] No JSON found in response:', result)
  } catch (parseError) {
    console.error('[OpenRouter] Failed to parse evaluation:', parseError)
  }

  return { score: 0, feedback: 'Не удалось оценить ответ. Попробуйте ещё раз.' }
}

export async function getAIHint(
  context: string,
  userQuestion: string,
  chatHistory: AIChatMessage[] = []
): Promise<string> {
  console.log('[OpenRouter] Getting AI hint for:', userQuestion.substring(0, 50))

  const systemPrompt = `Ты — AI-помощник на платформе подготовки к собеседованиям по Go. Помогай пользователю разобраться, но НЕ давай прямых ответов. Вместо этого:
- Направляй мышление подсказками
- Объясняй концепции, если их спрашивают
- Предлагай, на что обратить внимание
- Если спрашивают про задачу — подскажи подход, но не пиши код

Отвечай на русском, кратко и по делу.`

  const messages: AIChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-6), // Keep last 6 messages for context
    { role: 'user', content: `Контекст: ${context}\n\nВопрос: ${userQuestion}` },
  ]

  try {
    const response = await chatCompletion(messages, { temperature: 0.5, maxTokens: 512 })
    console.log('[OpenRouter] AI hint response:', response?.substring(0, 50))
    return response
  } catch (error) {
    console.error('[OpenRouter] Failed to get AI hint:', error)
    return 'К сожалению, AI помощник временно недоступен. Попробуйте позже.'
  }
}
