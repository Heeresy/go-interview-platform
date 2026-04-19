import { describe, it, expect, vi } from 'vitest'
import { trackEvent, trackQuestionAnswered } from '@/lib/analytics'

// Mock fetch
global.fetch = vi.fn()

describe('Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('trackEvent should send POST request to analytics endpoint', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    await trackEvent('test_event', { prop: 'value' })

    expect(global.fetch).toHaveBeenCalledWith('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('test_event'),
    })
  })

  it('trackQuestionAnswered should track question answer event', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    await trackQuestionAnswered('q123', 85, 120)

    expect(global.fetch).toHaveBeenCalled()
    const callBody = JSON.parse(
      (global.fetch as any).mock.calls[0][1].body
    )
    expect(callBody).toMatchObject({
      eventName: 'question_answered',
      questionId: 'q123',
      score: 85,
      timeSpent: 120,
    })
  })

  it('trackEvent should handle errors gracefully', async () => {
    ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await trackEvent('test_event')

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

