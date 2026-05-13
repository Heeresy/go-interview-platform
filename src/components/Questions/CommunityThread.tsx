'use client'

/**
 * `<CommunityThread />` — лента комментариев сообщества к вопросу
 * (task 17.6; Requirement 14.1).
 *
 * Контракт (жёсткий):
 *
 *   Props:
 *     {
 *       questionId: string;
 *       comments: CommunityComment[];
 *       onPost?: (text: string) => Promise<void>;
 *       isLoading?: boolean;
 *       error?: Error | null;
 *     }
 *
 *   `CommunityComment` — UI-shape, специально подобранный к контракту,
 *   ожидаемому страницей-потребителем (см. design.md: «Look at the repo
 *   for any existing community/comment API contract. If a comment shape
 *   exists in `src/types/database.ts`, reuse it.»). В `src/types/database.ts`
 *   есть только модель `MockSetRating` для рейтингов мок-интервью; никакой
 *   общей community-comment модели по вопросам в текущей схеме базы нет
 *   (Req 21.3 — схема Supabase не меняется). Поэтому этот компонент
 *   принимает уже отмаппленные UI-данные через пропсы и **не делает
 *   собственных сетевых запросов** — это сохраняет «существующую логику
 *   без изменений API» (Req 14.1, 14.2, 21.2).
 *
 *   Состояния (приоритет вычисления):
 *     1) `isLoading === true`            → loading-state (Req 20.1)
 *     2) `error != null`                 → error-state   (Req 20.3)
 *     3) `comments.length === 0`         → empty-state   (Req 20.2)
 *     4) success                         → лента + composer (если onPost)
 *
 *   Composer:
 *     - Рендерится **только** если передан `onPost`. Отсутствие колбэка
 *       означает read-only thread.
 *     - Submit вызывает `onPost(text)` и ждёт Promise; кнопка через
 *       контракт DS Button сама держит loading/disabled и блокирует
 *       повторный клик (Req 20.4, 20.5). При успехе — текст очищается,
 *       при ошибке — текст сохраняется, под полем показывается inline
 *       сообщение об ошибке (Req 20.3).
 *     - Пустой/whitespace-only текст не отправляется и подсвечивает поле
 *       через `error` пропс Textarea с локализованным сообщением.
 *
 *   Дизайн-токены (Req 1.8): фон/border/spacing/radius/typography —
 *   только через CSS-переменные (`--surface-*`, `--border-*`, `--space-*`,
 *   `--radius-*`, `--fs-*`, `--fw-*`). Никакого хардкода #xxx / rgb() / px
 *   в TSX. Контейнер — `<GlassCard>`.
 *
 *   i18n (Req 24.2): все строки через `t(...)` со словарём
 *   `questions.community.*` из `src/lib/i18n/ru.ts`. Все ключи уже
 *   объявлены (включая добавленные этой задачей `placeholder`,
 *   `submit`, `submitError`, `emptyError`).
 *
 *   Доступность:
 *     - Заголовок секции — `<h2>` с локализованным текстом.
 *     - Аватар: либо `<img>` с alt из `t('questions.community.avatarAlt', { name })`,
 *       либо `User`-иконка из `lucide-react` с `aria-hidden`.
 *     - Composer: textarea с label через DS `<Textarea label>`-проп,
 *       кнопка с локализованным лейблом `t('questions.community.submit')`.
 */

import * as React from 'react'
import type { CSSProperties } from 'react'
import { User } from 'lucide-react'

import {
  Button,
  EmptyState,
  ErrorState,
  GlassCard,
  Skeleton,
  Textarea,
} from '@/components/ui'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// ── Public types ────────────────────────────────────────────────────────

/**
 * UI-shape комментария сообщества. Не привязан к конкретной таблице
 * Supabase: страница-потребитель сама маппит свои данные в этот тип.
 * Это сохраняет API/схему БД без изменений (Req 21.2, 21.3).
 */
export interface CommunityCommentAuthor {
  id: string
  name: string
  avatarUrl?: string
}

export interface CommunityComment {
  id: string
  author: CommunityCommentAuthor
  /** ISO-строка момента создания. */
  createdAt: string
  content: string
}

export interface CommunityThreadProps {
  /** Идентификатор вопроса; передаётся, чтобы потребитель мог использовать его в `onPost`. */
  questionId: string
  /** Уже загруженные комментарии (success-state). Может быть пустым массивом — тогда empty-state. */
  comments: CommunityComment[]
  /**
   * Обработчик публикации нового комментария. Если не передан — composer
   * не рендерится, тред показывается в read-only режиме.
   */
  onPost?: (text: string) => Promise<void>
  /** Идёт сетевой запрос за списком комментариев. */
  isLoading?: boolean
  /** Ошибка сетевого запроса за списком комментариев. */
  error?: Error | null
  /** Дополнительный className на корневую GlassCard. */
  className?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Форматирует ISO-строку в человеко-понятный момент времени для RU-локали.
 * Невалидный ISO возвращаем как есть — безопаснее, чем throw.
 */
function formatCreatedAt(iso: string): string {
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/** Проверяет, что строка содержит хотя бы один непробельный символ. */
function hasContent(s: string): boolean {
  return s.trim().length > 0
}

// ── Styles (DS tokens only; Req 1.8) ────────────────────────────────────

const ROOT_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
  padding: 'var(--space-6)',
  borderRadius: 'var(--radius-lg)',
  minWidth: 0,
}

const HEADING_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-lg)',
  fontWeight: 'var(--fw-semibold)',
  color: 'var(--border-800)',
  lineHeight: 1.3,
  letterSpacing: '-0.01em',
  margin: 0,
}

const SUBTITLE_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-regular)',
  color: 'var(--border-700)',
  lineHeight: 1.5,
  margin: 0,
}

const LIST_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  margin: 0,
  padding: 0,
  listStyle: 'none',
  minWidth: 0,
}

const ITEM_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-3)',
  padding: 'var(--space-3)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--surface-100)',
  border: '1px solid var(--border-300)',
  minWidth: 0,
}

const AVATAR_STYLE: CSSProperties = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'var(--space-10)',
  height: 'var(--space-10)',
  borderRadius: 'var(--radius-full)',
  background: 'var(--surface-300)',
  color: 'var(--border-700)',
  overflow: 'hidden',
}

const AVATAR_IMG_STYLE: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
}

const ITEM_BODY_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)',
  flex: 1,
  minWidth: 0,
}

const ITEM_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 'var(--space-2)',
  flexWrap: 'wrap',
  minWidth: 0,
}

const AUTHOR_NAME_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-semibold)',
  color: 'var(--border-800)',
  lineHeight: 1.3,
  margin: 0,
}

const TIMESTAMP_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-xs)',
  fontWeight: 'var(--fw-regular)',
  color: 'var(--border-700)',
  lineHeight: 1.3,
  margin: 0,
}

const CONTENT_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-md)',
  fontWeight: 'var(--fw-regular)',
  color: 'var(--border-800)',
  lineHeight: 1.55,
  margin: 0,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

const COMPOSER_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  paddingTop: 'var(--space-3)',
  borderTop: '1px solid var(--border-300)',
  minWidth: 0,
}

const COMPOSER_ACTIONS_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 'var(--space-3)',
  minWidth: 0,
}

const COMPOSER_ERROR_STYLE: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'var(--fs-sm)',
  fontWeight: 'var(--fw-medium)',
  color: 'var(--danger)',
  lineHeight: 1.4,
  margin: 0,
}

const LOADING_LIST_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-3)',
  minWidth: 0,
}

const LOADING_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  minWidth: 0,
}

const LOADING_LINES_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  flex: 1,
  minWidth: 0,
}

// ── Subcomponents ───────────────────────────────────────────────────────

function CommentItem({ comment }: { comment: CommunityComment }) {
  const author = comment.author
  const displayName =
    author.name && author.name.trim().length > 0
      ? author.name
      : t('questions.community.unknownAuthor')

  return (
    <li style={ITEM_STYLE} data-testid="community-comment" data-comment-id={comment.id}>
      <span style={AVATAR_STYLE} data-testid="community-comment-avatar">
        {author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={author.avatarUrl}
            alt={t('questions.community.avatarAlt', { name: displayName })}
            style={AVATAR_IMG_STYLE}
          />
        ) : (
          <User aria-hidden="true" size={20} />
        )}
      </span>
      <div style={ITEM_BODY_STYLE}>
        <header style={ITEM_HEADER_STYLE}>
          <p style={AUTHOR_NAME_STYLE} data-testid="community-comment-author">
            {displayName}
          </p>
          <time
            style={TIMESTAMP_STYLE}
            dateTime={comment.createdAt}
            data-testid="community-comment-timestamp"
          >
            {formatCreatedAt(comment.createdAt)}
          </time>
        </header>
        <p style={CONTENT_STYLE} data-testid="community-comment-content">
          {comment.content}
        </p>
      </div>
    </li>
  )
}

interface ComposerProps {
  questionId: string
  onPost: (text: string) => Promise<void>
}

function Composer({ questionId, onPost }: ComposerProps) {
  const [value, setValue] = React.useState('')
  const [validationError, setValidationError] = React.useState<string | null>(
    null,
  )
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const handleSubmit = React.useCallback(async () => {
    if (!hasContent(value)) {
      setValidationError(t('questions.community.emptyError'))
      setSubmitError(null)
      return
    }
    setValidationError(null)
    setSubmitError(null)
    try {
      await onPost(value)
      // На успех — очищаем composer, чтобы не дублировать публикацию.
      setValue('')
    } catch {
      // Текст оставляем, чтобы пользователь не потерял ввод (Req 13.5
      // в смысле «без потери введённых данных формы» — здесь
      // переиспользуется тот же UX-инвариант).
      setSubmitError(t('questions.community.submitError'))
    }
  }, [onPost, value])

  return (
    <div
      style={COMPOSER_STYLE}
      data-testid="community-composer"
      data-question-id={questionId}
    >
      <Textarea
        aria-label={t('questions.community.placeholder')}
        placeholder={t('questions.community.placeholder')}
        value={value}
        rows={3}
        onChange={(e) => {
          setValue(e.target.value)
          if (validationError) setValidationError(null)
          if (submitError) setSubmitError(null)
        }}
        error={validationError ?? undefined}
        data-testid="community-composer-textarea"
      />
      {submitError ? (
        <p
          role="alert"
          style={COMPOSER_ERROR_STYLE}
          data-testid="community-composer-error"
        >
          {submitError}
        </p>
      ) : null}
      <div style={COMPOSER_ACTIONS_STYLE}>
        <Button
          variant="primary"
          size="md"
          onClick={handleSubmit}
          data-testid="community-composer-submit"
        >
          {t('questions.community.submit')}
        </Button>
      </div>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────

export function CommunityThread({
  questionId,
  comments,
  onPost,
  isLoading = false,
  error = null,
  className,
}: CommunityThreadProps) {
  const heading = (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        minWidth: 0,
      }}
    >
      <h2 style={HEADING_STYLE}>{t('questions.community.title')}</h2>
      <p style={SUBTITLE_STYLE}>{t('questions.community.subtitle')}</p>
    </header>
  )

  // ── 1. Loading (Req 20.1) ──
  if (isLoading) {
    return (
      <GlassCard
        className={cn(className)}
        style={ROOT_STYLE}
        data-ds="community-thread"
        data-state="loading"
        data-testid="community-thread"
      >
        {heading}
        <div
          role="status"
          aria-live="polite"
          aria-label={t('questions.community.loadingLabel')}
          style={LOADING_LIST_STYLE}
          data-testid="community-thread-loading"
        >
          {[0, 1, 2].map((i) => (
            <div key={i} style={LOADING_ROW_STYLE} aria-hidden="true">
              <Skeleton variant="avatar" />
              <div style={LOADING_LINES_STYLE}>
                <Skeleton variant="line" />
                <Skeleton variant="line" />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    )
  }

  // ── 2. Error (Req 20.3) ──
  if (error) {
    return (
      <GlassCard
        className={cn(className)}
        style={ROOT_STYLE}
        data-ds="community-thread"
        data-state="error"
        data-testid="community-thread"
      >
        {heading}
        <ErrorState messageKey="questions.community.error" />
      </GlassCard>
    )
  }

  // ── 3. Empty (Req 20.2) ──
  if (comments.length === 0) {
    return (
      <GlassCard
        className={cn(className)}
        style={ROOT_STYLE}
        data-ds="community-thread"
        data-state="empty"
        data-testid="community-thread"
      >
        {heading}
        <EmptyState
          title={t('questions.community.empty.title')}
          description={t('questions.community.empty.description')}
        />
        {onPost ? <Composer questionId={questionId} onPost={onPost} /> : null}
      </GlassCard>
    )
  }

  // ── 4. Success ──
  return (
    <GlassCard
      className={cn(className)}
      style={ROOT_STYLE}
      data-ds="community-thread"
      data-state="success"
      data-testid="community-thread"
    >
      {heading}
      <ul style={LIST_STYLE} data-testid="community-thread-list">
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </ul>
      {onPost ? <Composer questionId={questionId} onPost={onPost} /> : null}
    </GlassCard>
  )
}

export default CommunityThread
