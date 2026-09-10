/**
 * Catálogo de eventos de producto.
 * Nombres existentes se mantienen (Vercel ya los recibe). No renombrar.
 */

export const ANALYTICS_EVENTS = [
  "first_open",
  "app_open",
  "session_start",
  "place_view",
  "place_dwell_qualified",
  "useful_discovery",
  "place_share",
  "favorite_add",
  "favorite_remove",
  "review_submit",
  "map_open",
  "map_filter",
  "install_prompt_shown",
  "store_banner_shown",
  "store_banner_clicked",
  "store_banner_dismissed",
  "onboarding_complete",
  "city_page_view",
  "guide_page_view",
  "suggest_place_click",
  "place_submitted",
  "list_create",
  "list_open",
  "list_share",
  "city_to_map_click",
  "guide_to_map_click",
  "city_to_place_click",
  "search_performed",
  "search_no_results",
  "directions_clicked",
  "login_started",
  "login_completed",
  "login_error",
  "map_load_error",
  "place_load_error",
] as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number]

const EVENT_SET = new Set<string>(ANALYTICS_EVENTS)

export function isAnalyticsEvent(name: unknown): name is AnalyticsEvent {
  return typeof name === "string" && EVENT_SET.has(name)
}

/**
 * Eventos que alimentan el Admin Insights.
 * Se omiten widgets de store/PWA y clicks SEO de bajo valor para no inflar Mongo.
 */
export const FIRST_PARTY_EVENTS = new Set<AnalyticsEvent>([
  "first_open",
  "session_start",
  "place_view",
  "place_dwell_qualified",
  "useful_discovery",
  "place_share",
  "favorite_add",
  "favorite_remove",
  "review_submit",
  "map_open",
  "map_filter",
  "onboarding_complete",
  "city_page_view",
  "place_submitted",
  "list_create",
  "list_open",
  "search_performed",
  "search_no_results",
  "directions_clicked",
  "login_started",
  "login_completed",
  "login_error",
  "map_load_error",
  "place_load_error",
])

export const ALLOWED_EVENT_PROP_KEYS = new Set([
  "placeId",
  "city",
  "province",
  "category",
  "source",
  "hasType",
  "tagCount",
  "hasNeighborhood",
  "hasSafety",
  "hasSearch",
  "type",
  "neighborhood",
  "safetyLevel",
  "query",
  "resultCount",
  "kind",
  "store",
  "browser",
  "listId",
  "visibility",
  "total",
  "slug",
  "status",
  "provider",
  "reason",
  "mode",
  "dwellMs",
  "dwellThresholdMs",
  "commitmentType",
  "intentType",
])

export const PRODUCT_EVENT_TTL_SECONDS = 60 * 60 * 24 * 180
