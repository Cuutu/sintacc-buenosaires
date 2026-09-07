import { track } from "@vercel/analytics"
import { sanitizeAnalyticsProps } from "@/lib/analytics-sanitize"
import { enqueueFirstPartyEvent } from "@/lib/analytics-client"
import {
  isAnalyticsEvent,
  type AnalyticsEvent,
} from "@/lib/analytics-catalog"

export type { AnalyticsEvent }

/**
 * Eventos de analítica.
 * - Vercel Analytics: todos los eventos (como hasta ahora).
 * - First-party Mongo: subset para el Admin Insights. Ver analytics-catalog.ts.
 * Sanitize: nunca tokens/emails/URLs privadas.
 */
export { sanitizeAnalyticsProps }

export function trackEvent(
  name: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>
) {
  if (!isAnalyticsEvent(name)) return
  const props = sanitizeAnalyticsProps(properties)
  if (process.env.NODE_ENV !== "production") {
    console.log("[analytics]", name, props ?? {})
  }
  try {
    track(name, props)
  } catch {
    // Analytics no debe romper UX
  }
  try {
    enqueueFirstPartyEvent(name, props)
  } catch {
    // First-party no debe romper UX
  }
}
