'use client'

/**
 * `<ProfileContent />` — клиентский контент страницы `/profile`.
 *
 * Вынесен из `page.tsx`, чтобы не монтировать Supabase-запросы и хуки
 * до прохождения `AuthGate`. Компонент загружает данные профиля и
 * прогресса, затем рендерит модульные компоненты из
 * `@/components/profile` внутри `StatsBento` (Req 18.1, 18.2, 22.4).
 *
 * Бизнес-логика (`src/lib/**`, `src/app/api/**`) не модифицируется —
 * Req 21.1, 21.2, 21.5.
 */

import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import {
  ProfileHeader,
  StatsBento,
  ProgressCharts,
  AchievementsGrid,
  ActivityTimeline,
} from '@/components/profile'
import type {
  ProfileHeaderUser,
  ProgressChartsData,
  Achievement,
  ActivityTimelineItem,
} from '@/components/profile'
import { Skeleton } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserProgress } from '@/types/database'

// ── Props ────────────────────────────────────────────────────────────────

export interface ProfileContentProps {
  /** Supabase User из AuthGate. */
  user: User
}

// ── Component ────────────────────────────────────────────────────────────

export function ProfileContent({ user }: ProfileContentProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [progress, setProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    const supabase = createClient()

    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const { data: pr } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (p) setProfile(p)
    if (pr) setProgress(pr)
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          padding: 'var(--space-6)',
        }}
        data-testid="profile-loading"
      >
        <Skeleton style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              style={{ height: 120, borderRadius: 'var(--radius-lg)' }}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Map data to component props ────────────────────────────────────────

  const headerUser: ProfileHeaderUser = {
    id: user.id,
    email: user.email ?? undefined,
    name: profile?.display_name ?? profile?.username ?? undefined,
    avatarUrl: profile?.avatar_url ?? undefined,
  }

  const chartsData: ProgressChartsData = {
    monthlyBars: [],
    cumulativeLine: undefined,
  }

  const achievements: Achievement[] = []

  const activityItems: ActivityTimelineItem[] = []

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <StatsBento
      slots={[
        <ProfileHeader key="header" user={headerUser} />,
        <ProgressCharts key="charts" data={chartsData} />,
        <AchievementsGrid key="achievements" achievements={achievements} />,
        <ActivityTimeline key="activity" items={activityItems} />,
      ]}
    />
  )
}

export default ProfileContent
