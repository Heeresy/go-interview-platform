'use client'

import { useState, useCallback } from 'react'
import { Bot, X, Send, Loader2 } from 'lucide-react'
import type { AIChatMessage } from '@/types/database'

export default function AIAssistant({ context }: { context?: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  console.log('[AIAssistant] Render - open:', open)

  const send = useCallback(async () => {
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    console.log('[AIAssistant] Sending:', userMsg)

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const history: AIChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, question: userMsg, history }),
      })

      const data = await res.json()
      console.log('[AIAssistant] Response:', data)

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response || 'Нет ответа' },
      ])
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Ошибка'
      console.error('[AIAssistant] Error:', errorMsg)
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ Ошибка: ${errorMsg}` }])
    }
    setLoading(false)
  }, [input, loading, messages, context])

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => {
          console.log('[AIAssistant] Toggle clicked, current open:', open)
          setOpen(!open)
        }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: '#c084fc',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(192, 132, 252, 0.4)',
          zIndex: 9999,
        }}
      >
        {open ? <X size={24} /> : <Bot size={24} />}
      </button>

      {/* Panel - simplified, no animation */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '96px',
            right: '24px',
            width: '380px',
            maxHeight: '500px',
            background: '#1c1c1c',
            border: '2px solid #c084fc',
            borderRadius: '16px',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: '#171717',
            }}
          >
            <Bot size={20} style={{ color: '#c084fc' }} />
            <span style={{ fontWeight: 700, color: '#fff' }}>AI Помощник</span>
            <span style={{ flex: 1, color: '#71717a', fontSize: '0.75rem' }}>
              Не даёт прямых ответов
            </span>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: '#121212',
              minHeight: '200px',
            }}
          >
            {messages.length === 0 && (
              <p style={{ color: '#71717a', textAlign: 'center', padding: '24px' }}>
                Задайте вопрос — AI подскажет направление мышления, но не даст прямой ответ.
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  maxWidth: '85%',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? 'rgba(62, 207, 142, 0.15)' : '#262626',
                  color: msg.role === 'user' ? '#EDEDED' : '#A1A1AA',
                }}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                <Loader2
                  size={20}
                  style={{ animation: 'spin 1s linear infinite', color: '#c084fc' }}
                />
              </div>
            )}
          </div>

          {/* Input */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 16px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              background: '#171717',
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Спросите у AI..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#121212',
                color: '#EDEDED',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                background: loading || !input.trim() ? '#71717a' : '#3ECF8E',
                color: '#fff',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  )
}
