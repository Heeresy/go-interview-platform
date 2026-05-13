'use client'

/**
 * `<CommentThread />` — список комментариев + форма публикации нового
 * комментария для `Mock_Module` (task 20.3; Requirements 17.1, 17.5,
 * 10.8, 20.1, 20.2, 20.3, 20.4, 20.5, 22.1, 22.4, 24.2, 1.8).
 *
 * Структура зеркалит `src/components/Questions/CommunityThread.tsx`
 * (loading → error → empty → success ветки, GlassCard-обёртка, аватар +
 * имя + дата + контент, composer внизу), но имеет свой контракт пропсов
 * под доменную модель Mock_Module.
 *
 * Контракт (жёсткий):
 *
 *   Props:
 *     {
 *       comments: {
 *         id: string;
 *         author: { id: string; name: string; avatarUrl?: string };
 *         createdAt: string;     // ISO
 *         content: string;
 *       }[];
 *       onPost?: (text: string) => Promise<void>;
 *       isLoading?: boolean;
 *       error?: Error | null;
 *     }
 *
 *   Поведение (мирорит CommunityThread):
 *
 *   - Состояния (приоритет вычисления):
 *       1) `isLoading === true` → loading-state с тремя skeleton-строками
 *          (avatar + 2 line). Composer **скрыт** на время загрузки.
 *       2) `error != null`      → ErrorState. Composer **скрыт** —
 *          публикация в неконсистентное состояние недопустима.
 *       3) `comments.length === 0` → EmptyState (`mock.detail.empty.comments`).
 *          Composer виден, если передан `onPost`.
 *       4) success → лента карточек комментариев, composer виден,
 *          если передан `onPost`.
 *
 *   - Composer (`onPost`):
 *       - Submit вызывает `onPost(text)`. До resolve — кнопка
 *         блокирована (Req 20.4); после успеха — текст очищается +
 *         success-toast `t('mock.comment.saved')` через `useToast()`
 *         (Req 20.5).
 *       - При reject — текст сохраняется (UX: пользователь не теряет
 *         ввод), под полем рендерится inline error из
 *         `t('mock.comment.error')` (Req 20.3).
 *       - Whitespace-only текст не отправляется и подсвечивает
 *         textarea ошибкой `t('mock.comment.emptyError')` (Req 20.4).
 *
 *   - Подтверждение публикации через toast — мгновенное при
 *     `useReducedMotion` (Req 10.8) реализовано на уровне самого
 *     `Toast` компонента DS (длительность входа уже использует
 *     `reduced(duration.fast, 0)`).
 *
 *   - i18n (Req 24.2): все строки через `t()`. Ключи:
 *     `mock.detail.comments`, `mock.detail.empty.comments`,
 *     `mock.comment.placeholder`, `mock.comment.submit`,
 *     `mock.comment.saved`, `mock.comment.error`,
 *     `mock.comment.emptyError`, `state.error.unknown`.
 *
 *   - Стили — только токены DS (Req 1.8). Никаких `#xxx` / `rgb()` /
 *     px-литералов в TSX.
 */

import { User } from 'lucide-react'
import {
  useCallback,
  useState,
  type CSSProperties,
} from 'react'

import {
  Button,
  EmptyState,
  ErrorState,
  GlassCard,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'

// ── Public types ────────────────────────────────────────────────────────

/**
 * UI-shape автора комментария. Не привязан к конкретной таблице
 * Supabase: страница-потребитель сама маппит свои данные в этот тип
 * (Req 22.4). Это сохраняет API/схему БД без изменений (Req 21.2, 21.3).
 */
export interface CommentAuthor {
  /** Уникальный идентификатор автора. */
  id: string
  /** Имя автора для отображения. Если пустое — рендерится «Аноним». */
  name: string
  /** URL аватара. Если отсутствует — рендерится `User`-иконка. */
  avatarUrl?: string
}

/**
 * Нормализованный UI-контракт комментария. Совпадает по форме с
 * `CommunityComment` из `src/components/Questions/CommunityThread.tsx`,
 * чтобы оба треда могли переиспользовать единый mapper-стиль на
 * странице.
 */
export interface Comment {
  /** Уникальный идентификатор. */
  id: string
  /** Автор комментария. */
  author: CommentAuthor
  /** ISO-строка момента создания. */
  createdAt: string
  /** Текст комментария. */
  content: string
}

export interface CommentThreadProps {
  /** Список комментариев. Порядок сохраняется. */
  comments: Comment[]
  /**
   * Async-обработчик публикации нового комментария. Возврат Promise
   * включает loading-состояние кнопки и блокирует повторный клик
   * (Req 20.4). Если не передан — composer не рендерится, тред в
   * read-only режиме.
   */
  onPost?: (text: string) => Promise<void>
  /** Флаг загрузки списка. */
  isLoading?: boolean
  /** Ошибка загрузки списка. */
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

function CommentItem({ comment }: { comment: Comment }) {
  const author = comment.author
  const displayName =
    author.name && author.name.trim().length > 0
      ? author.name
      : t('questions.community.unknownAuthor')

  return (
    <li
      style={ITEM_STYLE}
      data-testid="comment-thread-item"
      data-comment-id={comment.id}
    >
      <span style={AVATAR_STYLE} data-testid="comment-thread-avatar">
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
          <p style={AUTHOR_NAME_STYLE} data-testid="comment-thread-author">
            {displayName}
          </p>
          <time
            style={TIMESTAMP_STYLE}
            dateTime={comment.createdAt}
            data-testid="comment-thread-timestamp"
          >
            {formatCreatedAt(comment.createdAt)}
          </time>
        </header>
        {comment.content ? (
          <p style={CONTENT_STYLE} data-testid="comment-thread-content">
            {comment.content}
          </p>
        ) : null}
      </div>
    </li>
  )
}

interface ComposerProps {
  onPost: (text: string) => Promise<void>
}

function Composer({ onPost }: ComposerProps) {
  const [value, setValue] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pending, setPending] = useState<boolean>(false)
  const toast = useToast().toast

  const handleSubmit = useCallback(async () => {
    if (pending) return
    if (!hasContent(value)) {
      // Whitespace-only — подсвечиваем textarea и не отправляем (Req 20.4).
      setValidationError(t('mock.comment.emptyError'))
      setSubmitError(null)
      return
    }
    setValidationError(null)
    setSubmitError(null)
    setPending(true)
    try {
      await onPost(value)
      // Успех: очищаем поле и тостим (Req 20.5).
      setValue('')
      toast({
        variant: 'success',
        title: t('mock.comment.saved'),
      })
    } catch {
      // Reject: текст оставляем, чтобы пользователь не потерял ввод.
      // Inline-сообщение об ошибке + error-toast (Req 20.3, 20.5).
      const errorMsg = t('mock.comment.error')
      setSubmitError(errorMsg)
      toast({
        variant: 'error',
        title: errorMsg,
      })
    } finally {
      setPending(false)
    }
  }, [pending, value, onPost, toast])

  return (
    <div style={COMPOSER_STYLE} data-testid="comment-thread-composer">
      <Textarea
        aria-label={t('mock.comment.placeholder')}
        placeholder={t('mock.comment.placeholder')}
        value={value}
        rows={3}
        disabled={pending}
        onChange={(e) => {
          setValue(e.target.value)
          if (validationError) setValidationError(null)
          if (submitError) setSubmitError(null)
        }}
        error={validationError ?? undefined}
        data-testid="comment-thread-textarea"
      />
      {submitError ? (
        <p
          role="alert"
          style={COMPOSER_ERROR_STYLE}
          data-testid="comment-thread-submit-error"
        >
          {submitError}
        </p>
      ) : null}
      <div style={COMPOSER_ACTIONS_STYLE}>
        <Button
          variant="primary"
          size="md"
          loading={pending}
          disabled={pending}
          onClick={() => {
            void handleSubmit()
          }}
          data-testid="comment-thread-submit"
        >
          {t('mock.comment.submit')}
        </Button>
      </div>
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────

export function CommentThread({
  comments,
  onPost,
  isLoading = false,
  error = null,
  className,
}: CommentThreadProps) {
  const heading = (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-1)',
        minWidth: 0,
      }}
    >
      <h2 style={HEADING_STYLE}>{t('mock.detail.comments')}</h2>
    </header>
  )

  // ── 1. Loading (Req 20.1) ──
  if (isLoading) {
    return (
      <GlassCard
        className={cn(className)}
        style={ROOT_STYLE}
        data-ds="mock-comment-thread"
        data-state="loading"
        data-testid="comment-thread"
      >
        {heading}
        <div
          role="status"
          aria-live="polite"
          aria-label={t('questions.community.loadingLabel')}
          style={LOADING_LIST_STYLE}
          data-testid="comment-thread-loading"
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
        data-ds="mock-comment-thread"
        data-state="error"
        data-testid="comment-thread"
      >
        {heading}
        <ErrorState messageKey="state.error.unknown" />
      </GlassCard>
    )
  }

  // ── 3. Empty (Req 20.2) ──
  if (comments.length === 0) {
    return (
      <GlassCard
        className={cn(className)}
        style={ROOT_STYLE}
        data-ds="mock-comment-thread"
        data-state="empty"
        data-testid="comment-thread"
      >
        {heading}
        <EmptyState title={t('mock.detail.empty.comments')} />
        {onPost ? <Composer onPost={onPost} /> : null}
      </GlassCard>
    )
  }

  // ── 4. Success ──
  return (
    <GlassCard
      className={cn(className)}
      style={ROOT_STYLE}
      data-ds="mock-comment-thread"
      data-state="success"
      data-testid="comment-thread"
    >
      {heading}
      <ul style={LIST_STYLE} data-testid="comment-thread-list">
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </ul>
      {onPost ? <Composer onPost={onPost} /> : null}
    </GlassCard>
  )
}

export default CommentThread
