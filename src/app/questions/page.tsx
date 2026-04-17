'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, Filter, ChevronRight, MessageSquareCode } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getDifficultyBadgeClass, getDifficultyLabel, truncate } from '@/lib/utils'
import type { Question, Category, Difficulty } from '@/types/database'

export default function QuestionsPage() {
    const [questions, setQuestions] = useState<Question[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null)

    useEffect(() => {
        loadData()
    }, [selectedCategory, selectedDifficulty])

    async function loadData() {
        const supabase = createClient()

        // Load categories
        const { data: cats } = await supabase
            .from('categories')
            .select('*')
            .order('sort_order')
        if (cats) setCategories(cats)

        // Load questions
        let query = supabase
            .from('questions')
            .select('*, category:categories(*)')
            .order('difficulty')
            .order('created_at', { ascending: false })

        if (selectedCategory) {
            query = query.eq('category_id', selectedCategory)
        }
        if (selectedDifficulty) {
            query = query.eq('difficulty', selectedDifficulty)
        }

        const { data } = await query
        if (data) setQuestions(data)
        setLoading(false)
    }

    const filtered = questions.filter(q =>
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.description.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="page">
            <div className="container">
                <div className="page__header">
                    <h1 className="page__title">Вопросы с собеседований</h1>
                    <p className="page__subtitle">
                        Открытые вопросы с AI-оценкой ваших ответов
                    </p>
                </div>

                {/* Filters */}
                <div className="filters glass glass--strong">
                    <div className="filters__search">
                        <Search size={18} className="filters__search-icon" />
                        <input
                            type="text"
                            className="input"
                            placeholder="Поиск вопросов..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="filters__row">
                        <div className="filters__group">
                            <Filter size={14} />
                            <span className="text-sm text-muted">Категория:</span>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    className={cn('badge', !selectedCategory && 'badge--info')}
                                    onClick={() => setSelectedCategory(null)}
                                    style={{ cursor: 'pointer', border: 'none' }}
                                >
                                    Все
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        className={cn('badge', selectedCategory === cat.id && 'badge--info')}
                                        onClick={() => setSelectedCategory(cat.id)}
                                        style={{ cursor: 'pointer', border: 'none' }}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="filters__group">
                            <span className="text-sm text-muted">Сложность:</span>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    className={cn('badge', !selectedDifficulty && 'badge--info')}
                                    onClick={() => setSelectedDifficulty(null)}
                                    style={{ cursor: 'pointer', border: 'none' }}
                                >
                                    Все
                                </button>
                                {([1, 2, 3, 4, 5] as Difficulty[]).map(d => (
                                    <button
                                        key={d}
                                        className={cn('badge', selectedDifficulty === d && getDifficultyBadgeClass(d))}
                                        onClick={() => setSelectedDifficulty(d)}
                                        style={{ cursor: 'pointer', border: 'none' }}
                                    >
                                        {getDifficultyLabel(d)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Questions List */}
                {loading ? (
                    <div className="grid grid--2" style={{ marginTop: 'var(--space-6)' }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <MessageSquareCode size={48} className="empty-state__icon" />
                        <p className="empty-state__title">Вопросы не найдены</p>
                        <p>Попробуйте изменить фильтры или поисковый запрос</p>
                    </div>
                ) : (
                    <div className="grid grid--2" style={{ marginTop: 'var(--space-6)' }}>
                        {filtered.map((question, i) => (
                            <motion.div
                                key={question.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05, duration: 0.3 }}
                            >
                                <Link href={`/questions/${question.id}`} className="question-card card">
                                    <div className="card__header">
                                        <span className={cn('badge', getDifficultyBadgeClass(question.difficulty))}>
                                            {getDifficultyLabel(question.difficulty)}
                                        </span>
                                        {question.category && (
                                            <span className="badge badge--purple">{question.category.name}</span>
                                        )}
                                    </div>
                                    <h3 className="card__title">{question.title}</h3>
                                    <p className="card__body">{truncate(question.description, 120)}</p>
                                    <div className="card__footer">
                                        <span className="text-sm text-muted" style={{ flex: 1 }}>
                                            {question.hint ? 'Есть подсказка' : ''}
                                        </span>
                                        <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
        .filters {
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .filters__search {
          position: relative;
        }
        .filters__search :global(.filters__search-icon) {
          position: absolute;
          left: var(--space-4);
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        .filters__search .input {
          padding-left: 44px;
        }
        .filters__row {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .filters__group {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          flex-wrap: wrap;
        }
        .question-card {
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
      `}</style>
        </div>
    )
}
