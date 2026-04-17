'use client'

import { createClient } from '@/lib/supabase/client'
import { Code2 } from 'lucide-react'

export default function LoginPage() {
    const handleLogin = async (provider: 'google' | 'discord') => {
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
    }

    return (
        <div className="login-page">
            <div className="login-card glass glass--strong">
                <div className="login-card__logo">
                    <Code2 size={36} strokeWidth={2.5} />
                    <span className="login-card__brand">
                        GO<span style={{ color: 'var(--color-primary)' }}>Prep</span>
                    </span>
                </div>

                <h1 className="login-card__title">Добро пожаловать</h1>
                <p className="login-card__subtitle">
                    Войдите, чтобы отслеживать прогресс и создавать свои MOCK-интервью
                </p>

                <div className="login-card__buttons">
                    <button className="login-btn" onClick={() => handleLogin('google')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Войти через Google
                    </button>
                    <button className="login-btn login-btn--discord" onClick={() => handleLogin('discord')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                        </svg>
                        Войти через Discord
                    </button>
                </div>

                <p className="login-card__note">
                    Мы не собираем и не храним ваши пароли
                </p>
            </div>

            <style jsx>{`
        .login-page {
          min-height: calc(100dvh - 72px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-6);
        }
        .login-card {
          width: 100%;
          max-width: 420px;
          padding: var(--space-10);
          text-align: center;
        }
        .login-card__logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          margin-bottom: var(--space-6);
          color: var(--text-primary);
        }
        .login-card__brand {
          font-size: var(--font-size-2xl);
          font-weight: 800;
        }
        .login-card__title {
          font-size: var(--font-size-2xl);
          font-weight: 700;
          margin-bottom: var(--space-2);
        }
        .login-card__subtitle {
          color: var(--text-secondary);
          font-size: var(--font-size-sm);
          margin-bottom: var(--space-8);
        }
        .login-card__buttons {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
          width: 100%;
          padding: var(--space-4);
          border-radius: var(--radius-md);
          border: 1px solid var(--glass-border);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-weight: 600;
          font-size: var(--font-size-sm);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
        }
        .login-btn:hover {
          background: var(--bg-hover);
          border-color: var(--glass-border-hover);
          transform: translateY(-1px);
        }
        .login-btn:active {
          transform: scale(0.98);
        }
        .login-btn--discord {
          background: #5865F2;
          border-color: #5865F2;
          color: #fff;
        }
        .login-btn--discord:hover {
          background: #4752c4;
          border-color: #4752c4;
        }
        .login-card__note {
          margin-top: var(--space-6);
          font-size: var(--font-size-xs);
          color: var(--text-muted);
        }
      `}</style>
        </div>
    )
}
