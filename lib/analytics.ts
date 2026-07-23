import { track } from "@vercel/analytics"

export type AnalyticsEvent =
  | "place_view"
  | "place_share"
  | "favorite_add"
  | "favorite_remove"
  | "review_submit"
  | "map_open"
  | "map_filter"
  | "install_prompt_shown"
  | "onboarding_complete"

export function trackEvent(
  name: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>
) {
  try {
    track(name, properties)
  } catch {
    // Analytics no debe romper UX
  }
}
