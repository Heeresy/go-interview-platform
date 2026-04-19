'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Users, Star, Plus, Clock, ArrowUpDown, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getDifficultyBadgeClass, getDifficultyLabel, formatTimeAgo, truncate } from '@/lib/utils'
import type { MockSet } from '@/types/database'

type SortBy = 'rating' | 'date'

export default function MockPage() {
    const [sets, setSets] = useState<MockSet[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState<SortBy>('rating')
    const [user, setUser] = useState<{ id: string } | null>(null)

    const loadData = useCallback(async () => {
        const supabase = createClient()

        const { data: { user: u } } = await supabase.auth.getUser()
        if (u) setUser({ id: u.id })

        const orderCol = sortBy === 'rating' ? 'avg_rating' : 'created_at'
        const { data } = await supabase
            .from('mock_sets')
            .select('*, author:profiles(*)')
            .eq('is_published', true)
            .order(orderCol, { ascending: false })

        if (data) setSets(data)
        setLoading(false)
    }, [sortBy])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filtered = sets.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="page">
            <div className="container">
                <div className="page__header flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h1 className="page__title">MOCK-собеседования</h1>
                        <p className="page__subtitle">Сеты вопросов и задач от сообщества</p>
                    </div>
                    {user && (
                        <Link href="/mock/create" className="btn btn--primary">
                            <Plus size={16} /> Создать сет
                        </Link>
                    )}
                </div>

                {/* Toolbar */}
                <div className="mock-toolbar glass glass--strong">
                    <div className="mock-toolbar__search">
                        <Search size={18} style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="input"
                            placeholder="Поиск MOCK-сетов..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: 44 }}
                        />
                    </div>
                    <div className="mock-toolbar__sort">
                        <ArrowUpDown size={14} />
                        <span className="text-sm text-muted">Сортировка:</span>
                        <button
                            className={cn('badge', sortBy === 'rating' && 'badge--info')}
                            onClick={() => setSortBy('rating')}
                            style={{ cursor: 'pointer', border: 'none' }}
                        >
                            <Star size={12} /> По рейтингу
                        </button>
                        <button
                            className={cn('badge', sortBy === 'date' && 'badge--info')}
                            onClick={() => setSortBy('date')}
                            style={{ cursor: 'pointer', border: 'none' }}
                        >
                            <Clock size={12} /> По дате
                        </button>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="grid grid--3" style={{ marginTop: 'var(--space-6)' }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} className="empty-state__icon" />
                        <p className="empty-state__title">Сеты не найдены</p>
                        <p>Станьте первым — создайте свой MOCK-сет!</p>
                    </div>
                ) : (
                    <div className="grid grid--3" style={{ marginTop: 'var(--space-6)' }}>
                        {filtered.map((set, i) => (
                            <motion.div key={set.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}>
                                <Link href={`/mock/${set.id}`} className="mock-card card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <div className="card__header">
                                        <span className={cn('badge', getDifficultyBadgeClass(set.difficulty))}>
                                            {getDifficultyLabel(set.difficulty)}
                                        </span>
                                        <div className="mock-card__rating">
                                            <Star size={14} style={{ color: 'var(--accent-yellow)', fill: 'var(--accent-yellow)' }} />
                                            <span>{set.avg_rating.toFixed(1)}</span>
                                            <span className="text-xs text-muted">({set.total_ratings})</span>
                                        </div>
                                    </div>
                                    <h3 className="card__title">{set.title}</h3>
                                    <p className="card__body">{truncate(set.description || '', 80)}</p>
                                    <div className="card__footer">
                                        <span className="text-xs text-muted">
                                            {set.question_ids.length} вопросов
                                            {set.task_ids?.length ? ` + ${set.task_ids.length} задач` : ''}
                                        </span>
                                        <span style={{ flex: 1 }} />
                                        <span className="text-xs text-muted">{formatTimeAgo(set.created_at)}</span>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
        .mock-toolbar {
          padding: var(--space-4) var(--space-6);
          display: flex;
          align-items: center;
          gap: var(--space-6);
          flex-wrap: wrap;
        }
        .mock-toolbar__search {
          position: relative;
          flex: 1;
          min-width: 200px;
        }
        .mock-toolbar__search > :first-child {
          position: absolute;
          left: var(--space-4);
          top: 50%;
          transform: translateY(-50%);
        }
        .mock-toolbar__sort {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .mock-card__rating {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-weight: 600;
          font-size: var(--font-size-sm);
        }
      `}</style>
        </div>
    )
}
