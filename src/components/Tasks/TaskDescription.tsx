/**
 * TaskDescription — glass-surface панель с описанием задачи.
 *
 * Рендерит title, `Badge` со сложностью и тело описания (markdown или plain)
 * поверх DS v2 `GlassPanel` (см. `src/components/ui/Panel.tsx`).
 *
 * Контракт:
 *   - `task: Task` (см. `src/types/database.ts`).
 *   - Все визуальные значения (color, spacing, radius, font-size) берутся
 *     из CSS-переменных Design System; hardcoded значений нет (Req 1.8).
 *   - Строки «Сложность: {level}» локализованы через `t()` из ru-словаря
 *     (Req 24.2) и `getDifficultyLabel()`.
 *
 * Requirements: 15.1, 15.4
 */

'use client'

import type { CSSProperties } from 'react'
import { Badge, GlassPanel } from '@/components/ui'
import type { BadgeVariant } from '@/components/ui'
import MarkdownContent from '@/components/ui/MarkdownContent'
import { t } from '@/lib/i18n'
import { getDifficultyLabel } from '@/lib/utils'
import type { Difficulty, Task } from '@/types/database'

export interface TaskDescriptionProps {
  task: Task
}

const DIFFICULTY_VARIANT: Record<Difficulty, BadgeVariant> = {
  1: 'success',
  2: 'info',
  3: 'info',
  4: 'warning',
  5: 'danger',
}

const PANEL_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)',
  height: '100%',
  overflow: 'auto',
}

const HEADER_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
}

const TITLE_STYLE: CSSProperties = {
  margin: 0,
  color: 'var(--border-900)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-xl)',
  fontWeight: 'var(--fw-semibold)',
  lineHeight: 1.2,
  letterSpacing: '-0.01em',
}

const META_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
  flexWrap: 'wrap',
}

const CATEGORY_STYLE: CSSProperties = {
  color: 'var(--border-700)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-medium)',
}

const BODY_STYLE: CSSProperties = {
  color: 'var(--border-800)',
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-md)',
  lineHeight: 1.6,
}

export function TaskDescription({ task }: TaskDescriptionProps) {
  const variant = DIFFICULTY_VARIANT[task.difficulty]
  const difficultyLabel = getDifficultyLabel(task.difficulty)

  return (
    <GlassPanel
      style={PANEL_STYLE}
      data-ds="task-description"
      aria-label={task.title}
    >
      <header style={HEADER_STYLE}>
        <h1 style={TITLE_STYLE}>{task.title}</h1>
        <div style={META_ROW_STYLE}>
          <Badge
            variant={variant}
            aria-label={t('dashboard.nextTask.difficulty', { level: difficultyLabel })}
          >
            {difficultyLabel}
          </Badge>
          {task.category ? (
            <span style={CATEGORY_STYLE}>{task.category.name}</span>
          ) : null}
        </div>
      </header>
      <div style={BODY_STYLE} data-ds="task-description-body">
        <MarkdownContent content={task.description} />
      </div>
    </GlassPanel>
  )
}

export default TaskDescription
