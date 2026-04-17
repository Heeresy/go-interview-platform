import { createClient } from "@/lib/supabase/server"

interface AnalyticsEvent {
  eventName: string
  userId?: string
  properties?: Record<string, any>
}

export async function POST(request: Request) {
  try {
    const { eventName, userId, properties } = (await request.json()) as AnalyticsEvent

    if (!eventName) {
      return Response.json({ error: "Event name required" }, { status: 400 })
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] ${eventName}`, { userId, ...properties })
    }

    // In production, you could send to Mixpanel, Segment, etc.
    // For now, just acknowledge receipt
    return Response.json({
      success: true,
      event: eventName,
    })
  } catch (error) {
    console.error("Analytics error:", error)
    return Response.json({ error: "Failed to track event" }, { status: 500 })
  }
}

