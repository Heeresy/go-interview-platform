import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AIChatMessage } from '@/types/database'

// Initialize the Google Generative AI with your API key
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

// Available models
const MODEL_NAME = 'gemini-3.1-flash-lite-preview'

/**
 * Chat completion using Google Gemini
 */
export async function chatCompletion(
    messages: AIChatMessage[],
    options?: {
        model?: string
        maxTokens?: number
        temperature?: number
    }
) {
    if (!process.env.GOOGLE_AI_API_KEY) {
        console.error('[AI] Google AI API key is not configured')
        throw new Error('Google AI API key is not configured. Please add GOOGLE_AI_API_KEY to your env.')
    }

    try {
        const model = genAI.getGenerativeModel({
            model: options?.model || MODEL_NAME,
            generationConfig: {
                maxOutputTokens: options?.maxTokens || 1024,
                temperature: options?.temperature ?? 0.3,
            }
        })

        // Convert AIChatMessage format to Gemini parts
        const systemInstruction = messages.find(m => m.role === 'system')?.content
        const chatMessages = messages.filter(m => m.role !== 'system')

        const chat = model.startChat({
            history: chatMessages.slice(0, -1).map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content }],
            })),
            systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
        })

        const lastMessage = chatMessages[chatMessages.length - 1]
        const result = await chat.sendMessage(lastMessage.content)
        const response = await result.response
        return response.text()
    } catch (error) {
        console.error('[AI] Gemini completion failed:', error)
        throw error
    }
}

/**
 * Evaluate user's answer
 */
export async function evaluateAnswer(
    question: string,
    referenceAnswer: string | null,
    userAnswer: string
): Promise<{ score: number; feedback: string }> {
    console.log('[AI] Evaluating answer with Gemini...')

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
        const model = genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: { responseMimeType: "application/json" }
        })

        const result = await model.generateContent([
            { text: systemPrompt },
            { text: userPrompt }
        ])

        const response = await result.response
        const text = response.text()

        const parsed = JSON.parse(text)
        return {
            score: Math.max(0, Math.min(100, Math.round(parsed.score))),
            feedback: parsed.feedback || 'Нет комментария.',
        }
    } catch (error) {
        console.error('[AI] Evaluation failed:', error)
        return { score: 0, feedback: 'Не удалось оценить ответ. Попробуйте ещё раз.' }
    }
}

/**
 * Get AI hint for tasks/questions
 */
export async function getAIHint(
    context: string,
    userQuestion: string,
    chatHistory: AIChatMessage[] = []
): Promise<string> {
    console.log('[AI] Getting hint with Gemini...')

    const systemPrompt = `Ты — AI-помощник на платформе подготовки к собеседованиям по Go. Помогай пользователю разобраться, но НЕ давай прямых ответов. Вместо этого:
- Направляй мышление подсказками
- Объясняй концепции, если их спрашивают
- Предлагай, на что обратить внимание
- Если спрашивают про задачу — подскажи подход, но не пиши код

Отвечай на русском, кратко и по делу.`

    try {
        const messages: AIChatMessage[] = [
            { role: 'system', content: systemPrompt },
            ...chatHistory.slice(-6),
            { role: 'user', content: `Контекст: ${context}\n\nВопрос: ${userQuestion}` },
        ]

        return await chatCompletion(messages, { temperature: 0.5, maxTokens: 512 })
    } catch (error) {
        console.error('[AI] Hint failed:', error)
        return 'К сожалению, AI помощник временно недоступен. Попробуйте позже.'
    }
}
