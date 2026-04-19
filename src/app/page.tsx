'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
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

const FaultyTerminal = dynamic(() => import('@/components/FaultyTerminal'), {
  ssr: false,
  loading: () => <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-primary)' }} />,
})

const CardSwap = dynamic(() => import('@/components/CardSwap'), {
  ssr: false,
})

const Card = dynamic(() => import('@/components/CardSwap').then(mod => mod.Card), {
  ssr: false,
})

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
      {/* Section 1: Hero with full background */}
      <section className="home__section home__section--1">
        <div className="hero__background">
          <FaultyTerminal
            scale={1.5}
            gridMul={[2, 1]}
            digitSize={1.2}
            timeScale={0.5}
            pause={false}
            scanlineIntensity={0.3}
            glitchAmount={0.9}
            flickerAmount={0.8}
            noiseAmp={0.8}
            chromaticAberration={0}
            dither={0}
            curvature={0.05}
            tint="#A7EF9E"
            mouseReact={false}
            mouseStrength={0.5}
            pageLoadAnimation={true}
            brightness={0.4}
          />
        </div>
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
            <motion.div className="hero__badge" variants={fadeUp} custom={0} aria-label="Бесплатная AI-платформа">
              <Sparkles size={14} aria-hidden="true" />
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
              <div key={stat.label} className="hero__stat" aria-label={`${stat.value} ${stat.label}`}>
                <div className="hero__stat-value">{stat.value}</div>
                <div className="hero__stat-label">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Section 2: Features */}
      <section className="home__section home__section--2">
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

      {/* Section 3: Why with CardSwap */}
      <section className="home__section home__section--3">
        <div className="container" style={{ position: 'relative', width: '100%', height: '100%' }}>
          <div style={{ flex: '0 0 40%', zIndex: 10 }}>
            <h2 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
              Почему мы лучше?
            </h2>
            <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--text-secondary)', margin: 0 }}>
              Три основные преимущества нашей платформы
            </p>
          </div>
          <div style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            <CardSwap
              width={500}
              height={400}
              cardDistance={60}
              verticalDistance={70}
              delay={4000}
              pauseOnHover={true}
              easing="elastic"
            >
              <Card>
                <div style={{ color: 'var(--accent-purple)', marginBottom: 'var(--space-4)' }}>
                  <Brain size={48} />
                </div>
                <h3>AI-оценка</h3>
                <p>Нейросеть анализирует ваш ответ и даёт подробную обратную связь, как настоящий интервьюер</p>
              </Card>
              <Card>
                <div style={{ color: 'var(--accent-yellow)', marginBottom: 'var(--space-4)' }}>
                  <Zap size={48} />
                </div>
                <h3>Запуск кода</h3>
                <p>Пишите и запускайте Go-код прямо в браузере с настоящими тестами и проверкой</p>
              </Card>
              <Card>
                <div style={{ color: 'var(--accent-green)', marginBottom: 'var(--space-4)' }}>
                  <Shield size={48} />
                </div>
                <h3>100% бесплатно</h3>
                <p>Все функции доступны бесплатно. Без подписок, без ограничений, без подвоха</p>
              </Card>
            </CardSwap>
          </div>
        </div>
      </section>

      <style jsx>{`
        .home {
          overflow-x: hidden;
          scroll-snap-type: y mandatory;
          scroll-behavior: smooth;
          height: 100vh;
          overflow-y: scroll;
        }

        /* === FULL SCREEN SECTIONS === */
        .home__section {
          width: 100%;
          min-height: 100vh;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .home__section--1 {
          padding: 0;
          min-height: 100vh;
        }

        .home__section--2 {
          min-height: 100vh;
          padding: var(--space-8) 0;
        }

        .home__section--3 {
          min-height: 100vh;
          padding: var(--space-8) 0;
        }

        /* === Hero (Section 1) === */
        .hero__background {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
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
          z-index: 2;
        }
        .hero__container {
          position: relative;
          text-align: center;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100%;
          padding: var(--space-8);
          color: #EDEDED;
        }
        .hero__content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .hero__badge {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: rgba(62, 207, 142, 0.2);
          color: #3ECF8E !important;
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
          max-width: 900px;
          color: #EDEDED !important;
        }
        .hero__title-accent {
          background: linear-gradient(135deg, #facc15, #fb923c);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero__subtitle {
          font-size: var(--font-size-lg);
          color: #A1A1AA !important;
          max-width: 600px;
          margin: 0 auto var(--space-8);
          line-height: var(--line-height-relaxed);
        }
        .hero__actions {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: auto;
        }
        .hero__actions .btn--secondary {
          color: #EDEDED !important;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .hero__actions .btn--secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }
        .hero__stats {
          display: flex;
          justify-content: center;
          gap: var(--space-12);
          margin-top: var(--space-16);
          padding-top: var(--space-8);
          border-top: 1px solid var(--border-color);
          width: 100%;
        }
        .hero__stat {
          text-align: center;
        }
        .hero__stat-value {
          font-size: var(--font-size-3xl);
          font-weight: 800;
          color: #3ECF8E !important;
        }
        .hero__stat-label {
          font-size: var(--font-size-sm);
          color: #A1A1AA !important;
          margin-top: var(--space-1);
        }

        /* === Features (Section 2) === */
        .home__section--2 {
          height: 100vh;
          padding: 0;
        }

        .home__section--2 .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          height: 100%;
          width: 100%;
          padding: 5vh var(--space-6) 0;
          box-sizing: border-box;
        }

        .features__header {
          text-align: center;
          margin-bottom: var(--space-8);
        }
        .features__title {
          font-size: var(--font-size-3xl);
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-top: 0;
        }
        .features__subtitle {
          font-size: var(--font-size-lg);
          color: var(--text-secondary);
          margin-top: var(--space-3);
        }
        .features__grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: var(--space-6);
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          justify-content: center;
          padding: 0 var(--space-6);
          box-sizing: border-box;
        }

        .features__grid-item {
          display: flex;
          width: 100%;
          min-width: 0;
        }

        @media (max-width: 1400px) {
          .features__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            max-width: 800px;
          }
        }

        @media (max-width: 640px) {
          .features__grid {
            grid-template-columns: 1fr;
            max-width: 400px;
          }
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

        /* === Why (Section 3) === */
        .home__section--3 .container {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          min-height: 100%;
          width: 100%;
          position: relative;
          gap: var(--space-16);
          padding: var(--space-12) var(--space-20);
        }

        .home__section--3 .container > div:first-child {
          flex: 0 0 40%;
          text-align: left;
          z-index: 10;
        }

        .home__section--3 .container > div:first-child h2 {
          margin: 0 0 var(--space-4) 0;
        }

        .home__section--3 .container > div:first-child p {
          margin: 0;
        }

        .why__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: var(--space-6);
          width: 100%;
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
          .home {
            scroll-snap-type: y mandatory;
          }

          .home__section {
            min-height: 100vh;
          }

          .hero__title {
            font-size: var(--font-size-3xl);
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
