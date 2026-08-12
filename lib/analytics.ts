import { track } from "@vercel/analytics"
import { sanitizeAnalyticsProps } from "@/lib/analytics-sanitize"

/**
 * Eventos de analítica (Vercel Analytics).
 * Ver sanitize en analytics-sanitize.ts — nunca tokens/emails/URLs privadas.
 */
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
  | "city_page_view"
  | "guide_page_view"
  | "suggest_place_click"
  | "list_create"
  | "list_open"
  | "list_share"
  | "city_to_map_click"
  | "guide_to_map_click"
  | "city_to_place_click"

export { sanitizeAnalyticsProps }

export function trackEvent(
  name: AnalyticsEvent,
  properties?: Record<string, string | number | boolean>
) {
  try {
    track(name, sanitizeAnalyticsProps(properties))
  } catch {
    // Analytics no debe romper UX
  }
}
