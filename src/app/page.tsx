'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  MessageSquareCode,
  Code2,
  GraduationCap,
  Users,
  Sparkles,
  ArrowRight,
  Zap,
  Shield,
  Brain,
} from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp: any = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.25, 1, 0.5, 1] as [number, number, number, number],
    },
  }),
}

const FEATURES = [
  {
    icon: MessageSquareCode,
    title: 'Вопросы с собеседований',
    description: 'Открытые вопросы с AI-оценкой ваших ответов. Получите обратную связь как от реального интервьюера.',
    href: '/questions',
    color: 'var(--accent-blue)',
    bg: 'rgba(56, 189, 248, 0.1)',
  },
  {
    icon: Code2,
    title: 'Задачи с запуском кода',
    description: 'Решайте задачи на Go прямо в браузере. Запускайте код с тестами и расширенной проверкой.',
    href: '/tasks',
    color: 'var(--accent-green)',
    bg: 'rgba(62, 207, 142, 0.1)',
  },
  {
    icon: GraduationCap,
    title: 'Тренажёр',
    description: 'Прогрессивная подготовка: вопросы по возрастанию сложности с блоком задач в конце.',
    href: '/trainer',
    color: 'var(--accent-purple)',
    bg: 'rgba(192, 132, 252, 0.1)',
  },
  {
    icon: Users,
    title: 'MOCK-собеседования',
    description: 'Создавайте свои наборы вопросов, делитесь с сообществом и проходите сеты других.',
    href: '/mock',
    color: 'var(--accent-orange)',
    bg: 'rgba(251, 146, 60, 0.1)',
  },
]

const STATS = [
  { value: '500+', label: 'вопросов' },
  { value: '200+', label: 'задач' },
  { value: 'AI', label: 'оценка ответов' },
  { value: '∞', label: 'бесплатно' },
]

export default function HomePage() {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__glow" />
        <div className="container hero__container">
          <motion.div
            className="hero__content"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.12 } },
            }}
          >
            <motion.div className="hero__badge" variants={fadeUp} custom={0}>
              <Sparkles size={14} />
              Бесплатная AI-платформа
            </motion.div>
            <motion.h1 className="hero__title" variants={fadeUp} custom={1}>
              Подготовьтесь к{' '}
              <span className="hero__title-accent">Go-собеседованию</span>
              <br />как профессионал
            </motion.h1>
            <motion.p className="hero__subtitle" variants={fadeUp} custom={2}>
              Вопросы с AI-оценкой, задачи с запуском кода, тренажёр с прогрессивной
              сложностью и MOCK-интервью от сообщества
            </motion.p>
            <motion.div className="hero__actions" variants={fadeUp} custom={3}>
              <Link href="/trainer" className="btn btn--primary btn--lg">
                Начать тренировку
                <ArrowRight size={18} />
              </Link>
              <Link href="/questions" className="btn btn--secondary btn--lg">
                Смотреть вопросы
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            className="hero__stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="hero__stat">
                <div className="hero__stat-value">{stat.value}</div>
                <div className="hero__stat-label">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <motion.div
            className="features__header"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="features__title">Всё для подготовки</h2>
            <p className="features__subtitle">
              От теоретических вопросов до практических задач — полный цикл подготовки
            </p>
          </motion.div>

          <div className="features__grid">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="features__grid-item"
              >
                <Link href={feature.href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                  <div className="feature-card card">
                    <div
                      className="feature-card__icon-wrapper"
                      style={{ background: feature.bg, color: feature.color }}
                    >
                      <feature.icon size={24} strokeWidth={2} />
                    </div>
                    <h3 className="feature-card__title">{feature.title}</h3>
                    <p className="feature-card__desc">{feature.description}</p>
                    <div className="feature-card__cta">
                      Перейти <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Section */}
      <section className="why">
        <div className="container">
          <motion.div
            className="why__grid"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
          >
            <motion.div className="why-card glass" variants={fadeUp} custom={0}>
              <div className="why-card__icon-wrapper" style={{ color: 'var(--accent-purple)' }}>
                <Brain size={32} />
              </div>
              <h3>AI-оценка</h3>
              <p>Нейросеть анализирует ваш ответ и даёт подробную обратную связь, как настоящий интервьюер</p>
            </motion.div>
            <motion.div className="why-card glass" variants={fadeUp} custom={1}>
              <div className="why-card__icon-wrapper" style={{ color: 'var(--accent-yellow)' }}>
                <Zap size={32} />
              </div>
              <h3>Запуск кода</h3>
              <p>Пишите и запускайте Go-код прямо в браузере с настоящими тестами и проверкой</p>
            </motion.div>
            <motion.div className="why-card glass" variants={fadeUp} custom={2}>
              <div className="why-card__icon-wrapper" style={{ color: 'var(--accent-green)' }}>
                <Shield size={32} />
              </div>
              <h3>100% бесплатно</h3>
              <p>Все функции доступны бесплатно. Без подписок, без ограничений, без подвоха</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <style jsx>{`
        .home {
          overflow-x: hidden;
        }
        /* === Hero === */
        .hero {
          position: relative;
          padding: var(--space-20) 0 var(--space-16);
        }
        .hero__glow {
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 500px;
          background: radial-gradient(
            ellipse,
            rgba(231, 198, 100, 0.08) 0%,
            rgba(171, 157, 242, 0.04) 40%,
            transparent 70%
          );
          pointer-events: none;
        }
        .hero__container {
          position: relative;
          text-align: center;
        }
        .hero__badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: var(--color-primary-muted);
          color: var(--color-primary);
          border-radius: var(--radius-full);
          font-size: var(--font-size-sm);
          font-weight: 600;
          margin-bottom: var(--space-6);
        }
        .hero__title {
          font-size: var(--font-size-5xl);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin-bottom: var(--space-6);
        }
        .hero__title-accent {
          background: linear-gradient(135deg, var(--accent-yellow), var(--accent-orange));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero__subtitle {
          font-size: var(--font-size-lg);
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto var(--space-8);
          line-height: var(--line-height-relaxed);
        }
        .hero__actions {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
          flex-wrap: wrap;
        }
        .hero__stats {
          display: flex;
          justify-content: center;
          gap: var(--space-12);
          margin-top: var(--space-16);
          padding-top: var(--space-8);
          border-top: 1px solid var(--border-color);
        }
        .hero__stat {
          text-align: center;
        }
        .hero__stat-value {
          font-size: var(--font-size-3xl);
          font-weight: 800;
          color: var(--color-primary);
        }
        .hero__stat-label {
          font-size: var(--font-size-sm);
          color: var(--text-muted);
          margin-top: var(--space-1);
        }

        /* === Features === */
        .features {
          padding: var(--space-20) 0;
        }
        .features__header {
          text-align: center;
          margin-bottom: var(--space-12);
        }
        .features__title {
          font-size: var(--font-size-3xl);
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .features__subtitle {
          font-size: var(--font-size-lg);
          color: var(--text-secondary);
          margin-top: var(--space-3);
        }
        .features__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-6);
        }
        .feature-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          height: 100%;
          position: relative;
        }
        .feature-card__icon-wrapper {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-4);
          flex-shrink: 0;
        }
        .feature-card__icon-wrapper :global(svg) {
          width: 24px;
          height: 24px;
        }
        .feature-card__title {
          font-size: var(--font-size-lg);
          font-weight: 700;
          margin-bottom: var(--space-2);
        }
        .feature-card__desc {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          line-height: var(--line-height-relaxed);
          flex: 1;
        }
        .feature-card__cta {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-top: var(--space-6);
          font-size: var(--font-size-sm);
          font-weight: 600;
          color: var(--color-primary);
        }

        /* === Why === */
        .why {
          padding: var(--space-8) 0 var(--space-20);
        }
        .why__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-6);
        }
        .why-card {
          padding: var(--space-8);
          text-align: center;
        }
        .why-card__icon-wrapper {
          margin-bottom: var(--space-4);
          display: flex;
          justify-content: center;
        }
        .why-card h3 {
          font-size: var(--font-size-xl);
          font-weight: 700;
          margin-bottom: var(--space-3);
        }
        .why-card p {
          font-size: var(--font-size-sm);
          color: var(--text-secondary);
          line-height: var(--line-height-relaxed);
        }

        @media (max-width: 768px) {
          .hero {
            padding: var(--space-12) 0 var(--space-10);
          }
          .hero__stats {
            gap: var(--space-6);
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  )
}
