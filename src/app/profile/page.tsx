'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { User, BarChart3, CheckCircle2, Code2, Flame } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, pluralize } from '@/lib/utils'
import type { Profile, UserProgress } from '@/types/database'

export default function ProfilePage() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [progress, setProgress] = useState<UserProgress | null>(null)
    const [loading, setLoading] = useState(true)

    const loadProfile = useCallback(async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        const { data: pr } = await supabase.from('user_progress').select('*').eq('user_id', user.id).single()
        if (p) setProfile(p)
        if (pr) setProgress(pr)
        setLoading(false)
    }, [])

    useEffect(() => {
        loadProfile()
    }, [loadProfile])

    if (loading) {
        return <div className="page"><div className="container container--narrow"><div className="skeleton" style={{ height: 300 }} /></div></div>
    }
    if (!profile) {
        return <div className="page"><div className="container container--narrow empty-state"><p className="empty-state__title">Войдите для просмотра профиля</p></div></div>
    }

    const accuracy = progress && progress.questions_answered > 0
        ? Math.round((progress.questions_correct / progress.questions_answered) * 100)
        : 0

    return (
        <div className="page">
            <div className="container container--narrow">
                <motion.div className="profile-header glass glass--strong" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="profile-avatar">
                        {profile.avatar_url ? (
                            <img src={profile.avatar_url} alt="" />
                        ) : (
                            <User size={32} />
                        )}
                    </div>
                    <div>
                        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{profile.display_name || profile.username}</h1>
                        <p className="text-sm text-muted">@{profile.username}</p>
                        <p className="text-xs text-muted" style={{ marginTop: 4 }}>На платформе с {formatDate(profile.created_at)}</p>
                    </div>
                </motion.div>

                {progress && (
                    <div className="stats-grid">
                        {[
                            { icon: CheckCircle2, label: 'Ответов', value: progress.questions_answered, color: 'var(--accent-blue)' },
                            { icon: BarChart3, label: 'Точность', value: `${accuracy}%`, color: 'var(--accent-green)' },
                            { icon: Code2, label: 'Задач', value: progress.tasks_completed, color: 'var(--accent-purple)' },
                            { icon: Flame, label: 'Серия', value: pluralize(progress.streak_days, 'день', 'дня', 'дней'), color: 'var(--accent-orange)' },
                        ].map((stat, i) => (
                            <motion.div key={stat.label} className="stat-card glass" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                                <stat.icon size={24} style={{ color: stat.color, marginBottom: 8 }} />
                                <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>{stat.value}</div>
                                <div className="text-sm text-muted">{stat.label}</div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
        .profile-header { display: flex; align-items: center; gap: var(--space-6); padding: var(--space-8); margin-bottom: var(--space-6); }
        .profile-avatar { width: 72px; height: 72px; border-radius: 50%; overflow: hidden; background: var(--bg-tertiary); display: flex; align-items: center; justify-content: center; color: var(--text-muted); flex-shrink: 0; }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--space-4); }
        .stat-card { padding: var(--space-6); text-align: center; }
      `}</style>
        </div>
    )
}
