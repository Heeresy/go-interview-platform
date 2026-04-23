'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, Filter, ChevronRight, MessageSquareCode, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn, getDifficultyBadgeClass, getDifficultyLabel, truncate } from '@/lib/utils'
import { AuraCard } from '@/components/ui/AuraCard'
import type { Question, Category, Difficulty } from '@/types/database'

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null)

  useEffect(() => {
    loadData()
  }, [selectedCategory, selectedDifficulty])

  async function loadData() {
    console.log('[Questions] Loading data...')
    setLoading(true)
    setError(null)
    const supabase = createClient()

    try {
      // Load categories
      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order')
      if (catsError) throw catsError
      if (cats) {
        console.log('[Questions] Loaded categories:', cats.length)
        setCategories(cats)
      }

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

      const { data, error: questionsError } = await query
      if (questionsError) throw questionsError

      if (data) {
        console.log('[Questions] Loaded questions:', data.length)
        setQuestions(data)
      } else {
        console.log('[Questions] No questions returned')
        setQuestions([])
      }
    } catch (err) {
      console.error('[Questions] Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const filtered = questions.filter(
    (q) =>
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="container">
        <div className="page__header">
          <h1 className="page__title">Вопросы с собеседований</h1>
          <p className="page__subtitle">Открытые вопросы с AI-оценкой ваших ответов</p>
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
                  aria-label="Показать все категории"
                >
                  Все
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={cn('badge', selectedCategory === cat.id && 'badge--info')}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{ cursor: 'pointer', border: 'none' }}
                    aria-pressed={selectedCategory === cat.id}
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
                  aria-label="Показать все уровни сложности"
                >
                  Все
                </button>
                {([1, 2, 3, 4, 5] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    className={cn('badge', selectedDifficulty === d && getDifficultyBadgeClass(d))}
                    onClick={() => setSelectedDifficulty(d)}
                    style={{ cursor: 'pointer', border: 'none' }}
                    aria-pressed={selectedDifficulty === d}
                  >
                    {getDifficultyLabel(d)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div
            className="glass"
            style={{
              padding: 'var(--space-6)',
              marginTop: 'var(--space-6)',
              background: 'rgba(248, 113, 113, 0.1)',
              border: '1px solid var(--accent-red)',
            }}
          >
            <div className="flex items-center gap-3" style={{ color: 'var(--accent-red)' }}>
              <MessageSquareCode size={24} />
              <div>
                <p style={{ fontWeight: 600 }}>Ошибка загрузки</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        {loading ? (
          <div className="questions-grid" style={{ marginTop: 'var(--space-6)' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton question-skeleton" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="empty-state glass"
            style={{ padding: 'var(--space-12)', marginTop: 'var(--space-6)', textAlign: 'center' }}
          >
            <MessageSquareCode
              size={48}
              style={{ color: 'var(--accent-purple)', marginBottom: 'var(--space-4)' }}
            />
            <p
              className="empty-state__title"
              style={{
                fontSize: 'var(--font-size-xl)',
                fontWeight: 600,
                marginBottom: 'var(--space-2)',
              }}
            >
              Вопросы не найдены
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              Попробуйте изменить фильтры или поисковый запрос
            </p>
          </div>
        ) : (
          <div className="questions-grid" style={{ marginTop: 'var(--space-6)' }}>
            {filtered.map((question, i) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="h-full"
              >
                <Link
                  href={`/questions/${question.id}`}
                  className="group block h-full no-underline"
                >
                  <AuraCard className="question-card flex flex-col p-6">
                    <div className="flex gap-2 mb-4 flex-wrap">
                      <span className={cn('badge', getDifficultyBadgeClass(question.difficulty))}>
                        {getDifficultyLabel(question.difficulty)}
                      </span>
                      {question.category && (
                        <span className="badge badge--purple">{question.category.name}</span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                      {question.title}
                    </h3>

                    <p className="text-sm text-secondary line-clamp-3 mb-6 flex-grow">
                      {truncate(question.description, 160)}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-glass-border">
                      <span className="text-xs text-muted flex items-center gap-1">
                        {question.hint && <Sparkles size={12} className="text-yellow-500" />}
                        {question.hint ? 'Есть подсказка' : ''}
                      </span>
                      <ChevronRight size={16} className="text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </AuraCard>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          padding-top: var(--space-20); /* Increased padding to clear fixed navbar */
        }
        .container {
          padding-top: var(--space-8);
        }
        .filters {
          padding: var(--space-6);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }
        .questions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: var(--space-6);
        }
        @media (max-width: 768px) {
          .questions-grid {
            grid-template-columns: 1fr;
          }
        }
        .question-skeleton {
          height: 180px;
          border-radius: var(--radius-lg);
          background: linear-gradient(
            90deg,
            var(--bg-secondary) 25%,
            var(--bg-hover) 50%,
            var(--bg-secondary) 75%
          );
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
        }
        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
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
          /* Styles moved to inline for better visibility */
        }
        .question-card-link {
          display: block;
          height: 100%;
        }
        .question-glow-card {
          height: 100%;
          display: flex; /* Ensure it behaves as a flex container */
          flex-direction: column;
          transition: transform 0.2s ease;
        }
        .question-glow-card:hover {
          transform: translateY(-4px);
        }
        .question-card-content {
          flex: 1;
        }
        .card__body:empty {
          display: none;
        }
      `}</style>
    </div>
  )
}
