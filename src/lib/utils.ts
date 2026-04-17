import type { Difficulty } from '@/types/database'

export function cn(...classes: (string | false | null | undefined)[]) {
    return classes.filter(Boolean).join(' ')
}

export function getDifficultyBadgeClass(difficulty: Difficulty): string {
    const map: Record<Difficulty, string> = {
        1: 'badge--easy',
        2: 'badge--medium',
        3: 'badge--medium',
        4: 'badge--hard',
        5: 'badge--expert',
    }
    return map[difficulty]
}

export function getDifficultyLabel(difficulty: Difficulty): string {
    const map: Record<Difficulty, string> = {
        1: 'Лёгкий',
        2: 'Средний',
        3: 'Выше среднего',
        4: 'Сложный',
        5: 'Экспертный',
    }
    return map[difficulty]
}

export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

export function formatTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'только что'
    if (minutes < 60) return `${minutes} мин назад`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} ч назад`
    const days = Math.floor(hours / 24)
    if (days < 30) return `${days} дн назад`
    return formatDate(dateStr)
}

export function pluralize(count: number, one: string, few: string, many: string): string {
    const mod10 = count % 10
    const mod100 = count % 100
    if (mod100 >= 11 && mod100 <= 19) return `${count} ${many}`
    if (mod10 === 1) return `${count} ${one}`
    if (mod10 >= 2 && mod10 <= 4) return `${count} ${few}`
    return `${count} ${many}`
}

export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength - 3) + '...'
}
