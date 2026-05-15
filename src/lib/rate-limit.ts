import { NextResponse } from 'next/server'

interface Bucket {
  count: number
  resetAt: number
}

export interface RateLimitOptions {
  key: string
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

const buckets = new Map<string, Bucket>()

function getClientId(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

function cleanupExpired(now: number): void {
  if (buckets.size < 1000) return

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now()
  cleanupExpired(now)

  const bucketKey = `${options.key}:${getClientId(request)}`
  const current = buckets.get(bucketKey)

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + options.windowMs,
    })

    return {
      allowed: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetAt: now + options.windowMs,
      retryAfterSeconds: 0,
    }
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      limit: options.limit,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    }
  }

  current.count += 1

  return {
    allowed: true,
    limit: options.limit,
    remaining: options.limit - current.count,
    resetAt: current.resetAt,
    retryAfterSeconds: 0,
  }
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'Retry-After': String(result.retryAfterSeconds),
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded',
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: rateLimitHeaders(result),
    },
  )
}

export function resetRateLimitForTests(): void {
  if (process.env.NODE_ENV === 'test') buckets.clear()
}
