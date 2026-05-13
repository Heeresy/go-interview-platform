'use client'

/**
 * `/trainer` — маршрут тренажёра (task 19.4, UI Redesign 2026).
 */

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

import { AppShell, AuthGate } from '@/components/shell'
import { TrainerShell } from '@/components/trainer'
import type { Difficulty } from '@/types/database'

function TrainerContent() {
  const searchParams = useSearchParams()
  const levelParam = Number(searchParams.get('level'))
  const initialLevel: Difficulty =
    levelParam >= 1 && levelParam <= 5 ? (levelParam as Difficulty) : 1

  return (
    <AuthGate
      guest={null}
      authenticated={({ user }) => (
        <AppShell user={user}>
          <TrainerShell initialLevel={initialLevel} />
        </AppShell>
      )}
    />
  )
}

export default function TrainerPage() {
  return (
    <Suspense fallback={null}>
      <TrainerContent />
    </Suspense>
  )
}
