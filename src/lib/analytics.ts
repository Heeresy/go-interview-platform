/**
 * Analytics tracking utility
 * Sends events to the analytics endpoint
 */

export const trackEvent = async (
  eventName: string,
  properties?: Record<string, unknown>
) => {
  if (typeof window === "undefined") return

  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        timestamp: new Date().toISOString(),
        ...properties,
      }),
    })
  } catch (error) {
    console.error("Failed to track event:", error)
  }
}

export const trackQuestionAnswered = (questionId: string, score: number, timeSpent: number) => {
  trackEvent("question_answered", {
    questionId,
    score,
    timeSpent,
  })
}

export const trackTaskSubmitted = (taskId: string, passed: boolean, executionTime: number) => {
  trackEvent("task_submitted", {
    taskId,
    passed,
    executionTime,
  })
}

export const trackTrainerProgress = (level: number, questionsAnswered: number) => {
  trackEvent("trainer_progress", {
    level,
    questionsAnswered,
  })
}

export const trackMockSetStarted = (mockSetId: string) => {
  trackEvent("mock_set_started", {
    mockSetId,
  })
}

export const trackPageView = (pageName: string) => {
  trackEvent("page_view", {
    pageName,
  })
}

