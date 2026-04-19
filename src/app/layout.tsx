import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import AIAssistant from '@/components/AIAssistant'
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"

export const metadata: Metadata = {
  title: 'GOPrep — Платформа подготовки к собеседованиям на Go',
  description:
    'Готовьтесь к техническим собеседованиям на Go-разработчика: вопросы с AI-оценкой, задачи с запуском кода, тренажёр, MOCK-интервью и AI-помощник.',
  keywords: ['Go', 'Golang', 'собеседование', 'подготовка', 'интервью', 'программирование'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Navbar />
        <main>{children}</main>
        <AIAssistant />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
