import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/react'

import { EtherealShadow, NoiseOverlay } from '@/components/effects'
import { ThemeProvider } from '@/components/shell/ThemeProvider'
import { SkipLink, ToastProvider } from '@/components/ui'
import { PageTransition } from '@/components/layout/PageTransition'

// TODO(task 1.3): обернуть дерево в `<DesignSystemGuard>` после реализации
//   `src/lib/design-system-guard.ts` (Requirement 1.10).
// TODO(task 24.5): подключить `detectIntegrations()` из
//   `src/lib/integrations/boot.ts` после его появления (Req 23.5, 25.1, 25.2).

export const metadata: Metadata = {
  title: 'GOPrep — Платформа подготовки к собеседованиям на Go',
  description:
    'Готовьтесь к техническим собеседованиям на Go-разработчика: вопросы с AI-оценкой, задачи с запуском кода, тренажёр, MOCK-интервью и AI-помощник.',
  keywords: ['Go', 'Golang', 'собеседование', 'подготовка', 'интервью', 'программирование'],
}

// Variable fonts via next/font/google (Requirements 1.6, 12.6, 23.3).
// Inter Variable — основной sans, с поддержкой Latin + Cyrillic для RU-интерфейса.
// JetBrains Mono Variable — моноширинный для кода.
// Шрифты проксируются на <html> через CSS-переменные; внешние <link>-теги запрещены (Req 12.6, 23.3).
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
  weight: 'variable',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
  weight: 'variable',
})

/**
 * Inline-bootstrap темы (Requirements 2.3, 2.4, 2.5, 2.7).
 *
 * Выполняется синхронно в `<head>` до первой отрисовки, поэтому
 * `document.documentElement.dataset.theme` уже проставлен на момент
 * гидратации `<ThemeProvider>` — это закрывает no-FOUC (Req 2.4).
 *
 * Алгоритм:
 *   1. Пытаемся получить `window.localStorage` и прочитать ключ `"theme"`.
 *   2. Если значение — `"dark"` или `"light"`, применяем его к `dataset.theme`.
 *   3. Иначе (отсутствует, пустое, невалидное) — ставим `"dark"` и пытаемся
 *      записать это значение в storage, чтобы инвариант Req 2.7
 *      (localStorage ↔ applied theme) держался с первого рендера.
 *   4. Внешний try/catch + внутренний try/catch при `setItem` —
 *      при недоступности storage (SecurityError, privacy mode и т.п.)
 *      тема остаётся `"dark"` для сессии без единой ошибки в консоли
 *      (Req 2.3, 2.5).
 *
 * Скрипт написан в ES5-совместимом стиле (`var`, IIFE) для максимальной
 * совместимости со старыми браузерами ещё до загрузки основного бандла.
 */
const THEME_BOOTSTRAP_SCRIPT =
  "(function(){try{var s=window.localStorage;var t=s&&s.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;}else{document.documentElement.dataset.theme='dark';try{if(s)s.setItem('theme','dark');}catch(e){}}}catch(e){document.documentElement.dataset.theme='dark';}})();"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        {/*
          Inline bootstrap темы. Должен стоять до `<body>`, чтобы `dataset.theme`
          был проставлен до первой отрисовки содержимого (Req 2.4).
        */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body>
        <ThemeProvider>
          <ToastProvider>
            {/*
              SkipLink — первый focusable элемент в DOM (Req 11.5, 11.6).
              Указывает на `<main id="main">` ниже по дереву.
            */}
            <SkipLink />

            {/*
              Фоновые слои (Req 3.1, 22.5). Монтируются единожды в корне.
              EtherealShadow — анимированный фон через SVG turbulence.
              z-index: -2 (фон), pointer-events: none.
            */}
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: -2,
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              <EtherealShadow
                color="rgba(80, 120, 200, 0.6)"
                animation={{ scale: 60, speed: 50 }}
                noise={{ opacity: 0.4, scale: 1.2 }}
                sizing="fill"
              />
            </div>
            <NoiseOverlay />

            <PageTransition>
              <main id="main" tabIndex={-1}>
                {children}
              </main>
            </PageTransition>
          </ToastProvider>
        </ThemeProvider>

        {/* Vercel analytics остаются в корне без изменений (Req 23.3, 25.1). */}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
