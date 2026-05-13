import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { CommunityThread, type CommunityComment } from './CommunityThread'
import { t } from '@/lib/i18n'

/**
 * CommunityThread — task 17.6.
 *
 * Покрытие:
 *   - Req 20.1: loading-state показывает Skeleton-список с
 *     `aria-label = t('questions.community.loadingLabel')`.
 *   - Req 20.3: error-state показывает inline ErrorState с ключом
 *     `questions.community.error`.
 *   - Req 20.2: пустой массив комментариев → EmptyState с
 *     локализованным title/description.
 *   - Success: список комментариев, для каждого — автор, дата, контент;
 *     при отсутствии avatarUrl рендерится `User`-иконка с aria-hidden;
 *     при наличии avatarUrl — `<img>` с alt из i18n.
 *   - Composer: рендерится только если передан `onPost`; пустой текст
 *     блокирует submit и подсвечивает поле; успешный submit очищает
 *     текст; неудачный submit сохраняет текст и показывает inline
 *     ошибку.
 *   - Heading всегда присутствует.
 *   - i18n: все строки берутся через `t()`.
 */

afterEach(() => cleanup())

function makeComment(overrides: Partial<CommunityComment> = {}): CommunityComment {
  return {
    id: overrides.id ?? 'c-1',
    author: overrides.author ?? {
      id: 'u-1',
      name: 'Алексей Петров',
    },
    createdAt: overrides.createdAt ?? '2026-01-15T10:30:00.000Z',
    content: overrides.content ?? 'Полезный комментарий по теме.',
  }
}

describe('CommunityThread — heading and structure', () => {
  it('renders the section heading from i18n in every state', () => {
    const { rerender } = render(
      <CommunityThread questionId="q-1" comments={[]} isLoading />,
    )
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: t('questions.community.title'),
      }),
    ).toBeInTheDocument()

    rerender(
      <CommunityThread
        questionId="q-1"
        comments={[]}
        error={new Error('boom')}
      />,
    )
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: t('questions.community.title'),
      }),
    ).toBeInTheDocument()

    rerender(<CommunityThread questionId="q-1" comments={[]} />)
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: t('questions.community.title'),
      }),
    ).toBeInTheDocument()

    rerender(
      <CommunityThread questionId="q-1" comments={[makeComment()]} />,
    )
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: t('questions.community.title'),
      }),
    ).toBeInTheDocument()
  })
})

describe('CommunityThread — state machine', () => {
  it('renders loading state with skeletons and a polite live region (Req 20.1)', () => {
    render(<CommunityThread questionId="q-1" comments={[]} isLoading />)

    const root = screen.getByTestId('community-thread')
    expect(root.dataset.state).toBe('loading')

    const region = screen.getByLabelText(t('questions.community.loadingLabel'))
    expect(region).toHaveAttribute('aria-live', 'polite')

    // Skeletons are rendered (avatar + line)
    const skeletons = root.querySelectorAll('[data-ds="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders ErrorState with the community error key (Req 20.3)', () => {
    render(
      <CommunityThread
        questionId="q-1"
        comments={[]}
        error={new Error('boom')}
      />,
    )

    const root = screen.getByTestId('community-thread')
    expect(root.dataset.state).toBe('error')

    const alert = within(root).getByRole('alert')
    expect(alert).toHaveTextContent(t('questions.community.error'))
  })

  it('renders empty state for an empty comments array (Req 20.2)', () => {
    render(<CommunityThread questionId="q-1" comments={[]} />)

    const root = screen.getByTestId('community-thread')
    expect(root.dataset.state).toBe('empty')

    expect(
      screen.getByText(t('questions.community.empty.title')),
    ).toBeInTheDocument()
    expect(
      screen.getByText(t('questions.community.empty.description')),
    ).toBeInTheDocument()
  })

  it('prioritises loading > error > empty > success', () => {
    const { rerender } = render(
      <CommunityThread
        questionId="q-1"
        comments={[makeComment()]}
        isLoading
        error={new Error('boom')}
      />,
    )
    expect(screen.getByTestId('community-thread').dataset.state).toBe(
      'loading',
    )

    rerender(
      <CommunityThread
        questionId="q-1"
        comments={[makeComment()]}
        error={new Error('boom')}
      />,
    )
    expect(screen.getByTestId('community-thread').dataset.state).toBe('error')

    rerender(<CommunityThread questionId="q-1" comments={[]} />)
    expect(screen.getByTestId('community-thread').dataset.state).toBe('empty')

    rerender(
      <CommunityThread questionId="q-1" comments={[makeComment()]} />,
    )
    expect(screen.getByTestId('community-thread').dataset.state).toBe(
      'success',
    )
  })
})

describe('CommunityThread — success rendering', () => {
  it('renders all comments with author, timestamp, and content', () => {
    const comments: CommunityComment[] = [
      makeComment({
        id: 'c-1',
        author: { id: 'u-1', name: 'Алексей' },
        content: 'Первый комментарий',
        createdAt: '2026-01-15T10:30:00.000Z',
      }),
      makeComment({
        id: 'c-2',
        author: { id: 'u-2', name: 'Мария' },
        content: 'Второй комментарий',
        createdAt: '2026-01-15T12:00:00.000Z',
      }),
    ]
    render(<CommunityThread questionId="q-1" comments={comments} />)

    const items = screen.getAllByTestId('community-comment')
    expect(items).toHaveLength(2)

    expect(items[0]).toHaveTextContent('Алексей')
    expect(items[0]).toHaveTextContent('Первый комментарий')
    expect(items[1]).toHaveTextContent('Мария')
    expect(items[1]).toHaveTextContent('Второй комментарий')

    // <time> element with the exact ISO in dateTime
    const timestamps = screen.getAllByTestId('community-comment-timestamp')
    expect(timestamps[0]).toHaveAttribute(
      'datetime',
      '2026-01-15T10:30:00.000Z',
    )
  })

  it('renders <img> with i18n alt when avatarUrl is provided', () => {
    render(
      <CommunityThread
        questionId="q-1"
        comments={[
          makeComment({
            author: {
              id: 'u-1',
              name: 'Алексей',
              avatarUrl: 'https://example.com/a.png',
            },
          }),
        ]}
      />,
    )

    const img = screen.getByAltText(
      t('questions.community.avatarAlt', { name: 'Алексей' }),
    )
    expect(img).toBeInstanceOf(HTMLImageElement)
    expect((img as HTMLImageElement).src).toBe('https://example.com/a.png')
  })

  it('falls back to a User icon (no <img>) when avatarUrl is missing', () => {
    render(
      <CommunityThread
        questionId="q-1"
        comments={[
          makeComment({
            author: { id: 'u-1', name: 'Аноним' },
          }),
        ]}
      />,
    )

    const avatar = screen.getByTestId('community-comment-avatar')
    expect(avatar.querySelector('img')).toBeNull()
    // Lucide icons render as <svg> with aria-hidden.
    expect(avatar.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('uses a localised fallback name when author name is empty', () => {
    render(
      <CommunityThread
        questionId="q-1"
        comments={[
          makeComment({
            author: { id: 'u-1', name: '' },
          }),
        ]}
      />,
    )

    expect(
      screen.getByTestId('community-comment-author'),
    ).toHaveTextContent(t('questions.community.unknownAuthor'))
  })
})

describe('CommunityThread — composer', () => {
  it('does not render composer when onPost is not provided', () => {
    render(
      <CommunityThread questionId="q-1" comments={[makeComment()]} />,
    )
    expect(screen.queryByTestId('community-composer')).toBeNull()
  })

  it('renders composer in success state when onPost is provided', () => {
    render(
      <CommunityThread
        questionId="q-1"
        comments={[makeComment()]}
        onPost={vi.fn(async () => {})}
      />,
    )
    expect(screen.getByTestId('community-composer')).toBeInTheDocument()
    expect(
      screen.getByTestId('community-composer-submit'),
    ).toHaveTextContent(t('questions.community.submit'))
  })

  it('renders composer in empty state when onPost is provided', () => {
    render(
      <CommunityThread
        questionId="q-1"
        comments={[]}
        onPost={vi.fn(async () => {})}
      />,
    )
    expect(screen.getByTestId('community-composer')).toBeInTheDocument()
  })

  it('blocks submit when text is empty/whitespace and shows inline error', async () => {
    const user = userEvent.setup()
    const onPost = vi.fn(async () => {})
    render(
      <CommunityThread
        questionId="q-1"
        comments={[makeComment()]}
        onPost={onPost}
      />,
    )

    await user.click(screen.getByTestId('community-composer-submit'))

    expect(onPost).not.toHaveBeenCalled()
    expect(
      screen.getByText(t('questions.community.emptyError')),
    ).toBeInTheDocument()
  })

  it('calls onPost with the text and clears the textarea on success', async () => {
    const user = userEvent.setup()
    const onPost = vi.fn(async () => {})
    render(
      <CommunityThread
        questionId="q-1"
        comments={[makeComment()]}
        onPost={onPost}
      />,
    )

    const textarea = screen.getByTestId(
      'community-composer-textarea',
    ) as HTMLTextAreaElement
    await user.type(textarea, 'Привет, сообщество!')
    await user.click(screen.getByTestId('community-composer-submit'))

    expect(onPost).toHaveBeenCalledWith('Привет, сообщество!')
    // After successful submit, textarea is cleared.
    expect(textarea.value).toBe('')
  })

  it('keeps the typed text and shows inline error when onPost rejects', async () => {
    const user = userEvent.setup()
    const onPost = vi.fn(async () => {
      throw new Error('network down')
    })
    render(
      <CommunityThread
        questionId="q-1"
        comments={[makeComment()]}
        onPost={onPost}
      />,
    )

    const textarea = screen.getByTestId(
      'community-composer-textarea',
    ) as HTMLTextAreaElement
    await user.type(textarea, 'Тест ошибки')
    await user.click(screen.getByTestId('community-composer-submit'))

    expect(onPost).toHaveBeenCalledTimes(1)
    expect(textarea.value).toBe('Тест ошибки')
    expect(
      screen.getByTestId('community-composer-error'),
    ).toHaveTextContent(t('questions.community.submitError'))
  })
})
