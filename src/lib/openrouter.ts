import type { AIChatMessage } from '@/types/database'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Free models available on OpenRouter
const FREE_MODELS = [
    'mistralai/mistral-7b-instruct:free',
    'google/gemma-2-9b-it:free',
    'meta-llama/llama-3.1-8b-instruct:free',
]

export async function chatCompletion(
    messages: AIChatMessage[],
    options?: {
        model?: string
        maxTokens?: number
        temperature?: number
    }
) {
    const model = options?.model || FREE_MODELS[0]

    const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
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

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
}

export async function evaluateAnswer(
    question: string,
    referenceAnswer: string | null,
    userAnswer: string
): Promise<{ score: number; feedback: string }> {
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

    const result = await chatCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ], { temperature: 0.2 })

    try {
        // Extract JSON from response
        const jsonMatch = result.match(/\{[\s\S]*?\}/)
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            return {
                score: Math.max(0, Math.min(100, Math.round(parsed.score))),
                feedback: parsed.feedback || 'Нет комментария.',
            }
        }
    } catch {
        // Fallback if JSON parsing fails
    }

    return { score: 0, feedback: 'Не удалось оценить ответ. Попробуйте ещё раз.' }
}

export async function getAIHint(
    context: string,
    userQuestion: string,
    chatHistory: AIChatMessage[] = []
): Promise<string> {
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

    return chatCompletion(messages, { temperature: 0.5, maxTokens: 512 })
}
