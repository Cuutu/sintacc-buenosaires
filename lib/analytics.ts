import { track } from "@vercel/analytics"
import { sanitizeAnalyticsProps } from "@/lib/analytics-sanitize"

/**
 * Eventos de analítica (Vercel Analytics).
 * Ver sanitize en analytics-sanitize.ts — nunca tokens/emails/URLs privadas.
 */
export type AnalyticsEvent =
  | "first_open"
  | "app_open"
  | "session_start"
  | "place_view"
  | "place_share"
  | "favorite_add"
  | "favorite_remove"
  | "review_submit"
  | "map_open"
  | "map_filter"
  | "install_prompt_shown"
  | "store_banner_shown"
  | "store_banner_clicked"
  | "store_banner_dismissed"
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
  const props = sanitizeAnalyticsProps(properties)
  if (process.env.NODE_ENV !== "production") {
    console.log("[analytics]", name, props ?? {})
  }
  try {
    track(name, props)
  } catch {
    // Analytics no debe romper UX
  }
}
