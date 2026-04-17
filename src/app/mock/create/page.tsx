'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Save } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn, getDifficultyLabel } from '@/lib/utils'
import type { Question, Task, Difficulty } from '@/types/database'

export default function CreateMockPage() {
    const router = useRouter()
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [difficulty, setDifficulty] = useState<Difficulty>(2)
    const [questions, setQuestions] = useState<Question[]>([])
    const [tasks, setTasks] = useState<Task[]>([])
    const [selQ, setSelQ] = useState<string[]>([])
    const [selT, setSelT] = useState<string[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const supabase = createClient()
        supabase.from('questions').select('*').order('difficulty').then(({ data }) => { if (data) setQuestions(data) })
        supabase.from('tasks').select('*').order('difficulty').then(({ data }) => { if (data) setTasks(data) })
    }, [])

    async function handleSave(publish: boolean) {
        if (!title.trim() || selQ.length === 0) return
        setSaving(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/login'); return }
        await supabase.from('mock_sets').insert({
            created_by: user.id, title, description, difficulty,
            question_ids: selQ, task_ids: selT.length > 0 ? selT : null, is_published: publish,
        })
        router.push('/mock')
    }

    const toggleQ = (id: string) => setSelQ(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
    const toggleT = (id: string) => setSelT(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

    return (
        <div className="page">
            <div className="container">
                <Link href="/mock" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 24, textDecoration: 'none' }}>
                    <ArrowLeft size={16} /> Назад
                </Link>
                <h1 className="page__title">Создать MOCK-собеседование</h1>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }}>
                    <div className="glass glass--strong" style={{ padding: 24 }}>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 8 }}>Название</label>
                        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Go Junior Interview" />
                        <label style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-size-sm)', marginTop: 16, marginBottom: 8 }}>Описание</label>
                        <textarea className="input textarea" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
                        <label style={{ display: 'block', fontWeight: 600, fontSize: 'var(--font-size-sm)', marginTop: 16, marginBottom: 8 }}>Сложность</label>
                        <div className="flex gap-2">
                            {([1, 2, 3, 4, 5] as Difficulty[]).map(d => (
                                <button key={d} className={cn('btn btn--sm', difficulty === d ? 'btn--primary' : 'btn--secondary')} onClick={() => setDifficulty(d)}>{getDifficultyLabel(d)}</button>
                            ))}
                        </div>
                        <div className="flex gap-3" style={{ marginTop: 24 }}>
                            <button className="btn btn--primary" onClick={() => handleSave(true)} disabled={saving || !title.trim() || selQ.length === 0}><Save size={16} /> Опубликовать</button>
                            <button className="btn btn--secondary" onClick={() => handleSave(false)} disabled={saving}>Черновик</button>
                        </div>
                        <p className="text-sm text-muted" style={{ marginTop: 12 }}>Выбрано: {selQ.length} вопросов, {selT.length} задач</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="glass glass--strong" style={{ padding: 24 }}>
                            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Вопросы</h3>
                            <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {questions.map(q => (
                                    <label key={q.id} className={cn('flex items-center gap-3')} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: selQ.includes(q.id) ? 'var(--color-primary-muted)' : 'transparent' }}>
                                        <input type="checkbox" checked={selQ.includes(q.id)} onChange={() => toggleQ(q.id)} />
                                        <span className="text-sm">{q.title}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="glass glass--strong" style={{ padding: 24 }}>
                            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Задачи</h3>
                            <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {tasks.map(t => (
                                    <label key={t.id} className="flex items-center gap-3" style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: selT.includes(t.id) ? 'var(--color-primary-muted)' : 'transparent' }}>
                                        <input type="checkbox" checked={selT.includes(t.id)} onChange={() => toggleT(t.id)} />
                                        <span className="text-sm">{t.title}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
