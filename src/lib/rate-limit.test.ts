import { beforeEach, describe, expect, it } from 'vitest'

import {
  checkRateLimit,
  rateLimitHeaders,
  resetRateLimitForTests,
} from './rate-limit'

function requestFor(ip: string): Request {
  return new Request('https://example.test/api', {
    headers: {
      'x-forwarded-for': ip,
    },
  })
}

describe('rate limit', () => {
  beforeEach(() => {
    resetRateLimitForTests()
  })

  it('allows requests until the limit is reached', () => {
    const options = { key: 'test', limit: 2, windowMs: 60_000 }

    const first = checkRateLimit(requestFor('192.0.2.1'), options)
    const second = checkRateLimit(requestFor('192.0.2.1'), options)
    const third = checkRateLimit(requestFor('192.0.2.1'), options)

    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(1)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(0)
    expect(third.allowed).toBe(false)
    expect(third.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('keeps separate buckets per client', () => {
    const options = { key: 'test', limit: 1, windowMs: 60_000 }

    expect(checkRateLimit(requestFor('192.0.2.1'), options).allowed).toBe(true)
    expect(checkRateLimit(requestFor('192.0.2.2'), options).allowed).toBe(true)
    expect(checkRateLimit(requestFor('192.0.2.1'), options).allowed).toBe(false)
  })

  it('emits standard response headers', () => {
    const result = checkRateLimit(requestFor('192.0.2.1'), {
      key: 'test',
      limit: 3,
      windowMs: 60_000,
    })

    expect(rateLimitHeaders(result)).toMatchObject({
      'Retry-After': '0',
      'X-RateLimit-Limit': '3',
      'X-RateLimit-Remaining': '2',
    })
  })
})
