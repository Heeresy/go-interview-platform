'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Loader2 } from 'lucide-react'
import type { AIChatMessage } from '@/types/database'

export default function AIAssistant({ context }: { context?: string }) {
    const [open, setOpen] = useState(false)
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    async function send() {
        if (!input.trim() || loading) return
        const userMsg = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setLoading(true)

        try {
            const history: AIChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }))
            const res = await fetch('/api/ai-assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ context, question: userMsg, history }),
            })
            const data = await res.json()
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Ошибка. Попробуйте позже.' }])
        }
        setLoading(false)
    }

    return (
        <>
            <button className="ai-fab" onClick={() => setOpen(!open)} aria-label="AI помощник">
                {open ? <X size={24} /> : <Bot size={24} />}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div className="ai-panel glass glass--strong" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }} transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}>
                        <div className="ai-panel__header">
                            <Bot size={20} style={{ color: 'var(--accent-purple)' }} />
                            <span style={{ fontWeight: 700 }}>AI Помощник</span>
                            <span className="text-xs text-muted" style={{ flex: 1 }}>Не даёт прямых ответов</span>
                        </div>
                        <div className="ai-panel__messages">
                            {messages.length === 0 && (
                                <p className="text-sm text-muted text-center" style={{ padding: 24 }}>
                                    Задайте вопрос — AI подскажет направление мышления, но не даст прямой ответ.
                                </p>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`ai-msg ai-msg--${msg.role}`}>
                                    <p>{msg.content}</p>
                                </div>
                            ))}
                            {loading && <div className="ai-msg ai-msg--assistant"><Loader2 size={16} className="spin" /></div>}
                        </div>
                        <div className="ai-panel__input">
                            <input className="input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Спросите у AI..." disabled={loading} />
                            <button className="btn btn--primary btn--icon" onClick={send} disabled={loading || !input.trim()}>
                                <Send size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style jsx>{`
        .ai-fab { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: var(--accent-purple); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(171, 157, 242, 0.4); z-index: var(--z-overlay); transition: transform 150ms; }
        .ai-fab:hover { transform: scale(1.05); }
        .ai-fab:active { transform: scale(0.95); }
        .ai-panel { position: fixed; bottom: 96px; right: 24px; width: 380px; max-height: 500px; z-index: var(--z-overlay); display: flex; flex-direction: column; overflow: hidden; }
        .ai-panel__header { display: flex; align-items: center; gap: 8px; padding: 16px; border-bottom: 1px solid var(--border-color); }
        .ai-panel__messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
        .ai-msg { padding: 10px 14px; border-radius: 12px; font-size: var(--font-size-sm); line-height: 1.5; max-width: 85%; white-space: pre-wrap; }
        .ai-msg--user { background: var(--color-primary-muted); color: var(--text-primary); align-self: flex-end; border-bottom-right-radius: 4px; }
        .ai-msg--assistant { background: var(--bg-secondary); color: var(--text-secondary); align-self: flex-start; border-bottom-left-radius: 4px; }
        .ai-panel__input { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--border-color); }
        :global(.spin) { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 480px) { .ai-panel { width: calc(100vw - 32px); right: 16px; bottom: 88px; } }
      `}</style>
        </>
    )
}
