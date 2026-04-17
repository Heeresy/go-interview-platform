/**
 * Trainer algorithm for adaptive difficulty progression
 */

export interface TrainerState {
  userId: string
  currentLevel: number // 1-5
  questionsAnswered: number
  correctAnswers: number
  sessionId: string
  scores: number[]
}

/**
 * Determines the next action based on score
 * - Score >= 80: Skip to harder level
 * - Score < 60: Retry at easier level
 * - 60-80: Stay at current level
 */
export function getNextAction(score: number, currentLevel: number) {
  if (score >= 80 && currentLevel < 5) {
    return {
      action: "skip" as const,
      nextLevel: Math.min(currentLevel + 1, 5),
      message: "Great! Moving to the next level 🚀",
    }
  }

  if (score < 60 && currentLevel > 1) {
    return {
      action: "retry" as const,
      nextLevel: Math.max(currentLevel - 1, 1),
      message: "Let's practice at this level a bit more 💪",
    }
  }

  return {
    action: "stay" as const,
    nextLevel: currentLevel,
    message: "Good effort! Let's try another one at this level",
  }
}

/**
 * Calculate progress percentage
 */
export function getProgressPercentage(level: number, questionsAtLevel: number): number {
  // Assume each level needs 5 correct answers to progress
  const questionsPerLevel = 5
  return Math.min((questionsAtLevel / questionsPerLevel) * 100, 100)
}

/**
 * Get difficulty description
 */
export function getDifficultyLabel(level: number): string {
  const labels = ["Beginner", "Easy", "Medium", "Hard", "Expert"]
  return labels[level - 1] || "Unknown"
}

/**
 * Format streak
 */
export function formatStreak(streak: number): string {
  if (streak === 0) return "No streak"
  if (streak === 1) return "🔥 1"
  if (streak < 5) return `🔥 ${streak}`
  if (streak < 10) return `🔥🔥 ${streak}`
  return `🔥🔥🔥 ${streak}`
}

