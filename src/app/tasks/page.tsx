'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, Filter, Code2, ChevronRight, Clock, MemoryStick } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getDifficultyBadgeClass, getDifficultyLabel, truncate } from '@/lib/utils'
import type { Task, Category, Difficulty } from '@/types/database'

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null)

    const loadData = useCallback(async () => {
        const supabase = createClient()

        const { data: cats } = await supabase
            .from('categories')
            .select('*')
            .order('sort_order')
        if (cats) setCategories(cats)

        let query = supabase
            .from('tasks')
            .select('*, category:categories(*)')
            .order('difficulty')
            .order('created_at', { ascending: false })

        if (selectedCategory) query = query.eq('category_id', selectedCategory)
        if (selectedDifficulty) query = query.eq('difficulty', selectedDifficulty)

        const { data } = await query
        if (data) setTasks(data)
        setLoading(false)
    }, [selectedCategory, selectedDifficulty])

    useEffect(() => {
        loadData()
    }, [loadData])

    const filtered = tasks.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="page">
            <div className="container">
                <div className="page__header">
                    <h1 className="page__title">Задачи с собеседований</h1>
                    <p className="page__subtitle">
                        Решайте задачи на Go прямо в браузере
                    </p>
                </div>

                {/* Filters */}
                <div className="filters glass glass--strong">
                    <div className="filters__search">
                        <Search size={18} className="filters__search-icon" />
                        <input
                            type="text"
                            className="input"
                            placeholder="Поиск задач..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: 44 }}
                            aria-label="Поиск задач"
                        />
                    </div>
                    <div className="filters__row">
                        <div className="filters__group">
                            <Filter size={14} />
                            <span className="text-sm text-muted">Категория:</span>
                            <div className="flex gap-2 flex-wrap">
                                <button className={cn('badge', !selectedCategory && 'badge--info')} onClick={() => setSelectedCategory(null)} style={{ cursor: 'pointer', border: 'none' }} aria-label="Показать все категории">Все</button>
                                {categories.map(cat => (
                                    <button key={cat.id} className={cn('badge', selectedCategory === cat.id && 'badge--info')} onClick={() => setSelectedCategory(cat.id)} style={{ cursor: 'pointer', border: 'none' }} aria-pressed={selectedCategory === cat.id}>{cat.name}</button>
                                ))}
                            </div>
                        </div>
                        <div className="filters__group">
                            <span className="text-sm text-muted">Сложность:</span>
                            <div className="flex gap-2 flex-wrap">
                                <button className={cn('badge', !selectedDifficulty && 'badge--info')} onClick={() => setSelectedDifficulty(null)} style={{ cursor: 'pointer', border: 'none' }} aria-label="Показать все уровни сложности">Все</button>
                                {([1, 2, 3, 4, 5] as Difficulty[]).map(d => (
                                    <button key={d} className={cn('badge', selectedDifficulty === d && getDifficultyBadgeClass(d))} onClick={() => setSelectedDifficulty(d)} style={{ cursor: 'pointer', border: 'none' }} aria-pressed={selectedDifficulty === d}>{getDifficultyLabel(d)}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tasks List */}
                {loading ? (
                    <div className="grid grid--2" style={{ marginTop: 'var(--space-6)' }}>
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty-state">
                        <Code2 size={48} className="empty-state__icon" />
                        <p className="empty-state__title">Задачи не найдены</p>
                    </div>
                ) : (
                    <div className="grid grid--2" style={{ marginTop: 'var(--space-6)' }}>
                        {filtered.map((task, i) => (
                            <motion.div key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}>
                                <Link href={`/tasks/${task.id}`} className="task-card card" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <div className="card__header">
                                        <span className={cn('badge', getDifficultyBadgeClass(task.difficulty))}>
                                            {getDifficultyLabel(task.difficulty)}
                                        </span>
                                        {task.category && <span className="badge badge--purple">{task.category.name}</span>}
                                    </div>
                                    <h3 className="card__title">{task.title}</h3>
                                    <p className="card__body">{truncate(task.description, 100)}</p>
                                    <div className="card__footer">
                                        <span className="text-xs text-muted flex items-center gap-1">
                                            <Clock size={12} /> {task.time_limit_ms / 1000}с
                                        </span>
                                        <span className="text-xs text-muted flex items-center gap-1">
                                            <MemoryStick size={12} /> {task.memory_limit_mb}MB
                                        </span>
                                        <span style={{ flex: 1 }} />
                                        <span className="text-xs text-muted">
                                            {task.test_cases?.length || 0} тестов
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
      `}</style>
        </div>
    )
}
