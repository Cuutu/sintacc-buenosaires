/**
 * Web vitals propios (reemplazan a Speed Insights, que no anda fuera de Vercel).
 *
 * El cliente manda un evento `web_vital` por métrica y por carga de página
 * (ver lib/web-vitals-client.ts). Acá viven las piezas que comparten cliente,
 * API y admin: qué métricas guardamos, cómo agrupamos rutas y los umbrales
 * "bueno / mejorable / malo" de web.dev.
 */

export const WEB_VITAL_METRICS = ["LCP", "INP", "CLS", "FCP", "TTFB"] as const
export type WebVitalMetric = (typeof WEB_VITAL_METRICS)[number]

export function isWebVitalMetric(name: unknown): name is WebVitalMetric {
  return typeof name === "string" && (WEB_VITAL_METRICS as readonly string[]).includes(name)
}

/** Umbrales de web.dev: hasta `good` es bueno; por encima de `poor`, malo. */
export const WEB_VITAL_THRESHOLDS: Record<WebVitalMetric, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
}

export type WebVitalRating = "good" | "needs-improvement" | "poor"

export function rateWebVital(metric: WebVitalMetric, value: number): WebVitalRating {
  const t = WEB_VITAL_THRESHOLDS[metric]
  if (value <= t.good) return "good"
  if (value <= t.poor) return "needs-improvement"
  return "poor"
}

/** CLS con 3 decimales; el resto en ms enteros. */
export function roundWebVitalValue(metric: WebVitalMetric, value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  if (metric === "CLS") return Math.round(value * 1000) / 1000
  return Math.round(value)
}

export const WEB_VITAL_ROUTE_GROUPS = [
  "home",
  "mapa",
  "lugar",
  "ciudad",
  "provincia",
  "categoria",
  "explorar",
  "emprendimientos",
  "listas",
  "guias",
  "favoritos",
  "perfil",
  "sugerir",
  "institucional",
  "otras",
] as const
export type WebVitalRouteGroup = (typeof WEB_VITAL_ROUTE_GROUPS)[number]

const INSTITUTIONAL = new Set([
  "/como-funciona",
  "/como-verificamos-los-lugares",
  "/comprar-productos-sin-tacc",
  "/contacto",
  "/por-que-usar-celimap",
  "/privacidad",
  "/que-es-celimap",
  "/sobre-nosotros",
  "/terminos",
  "/sin-gluten-argentina",
])

/**
 * Agrupa la ruta de entrada en pocas familias, para que el p75 tenga muestras
 * suficientes y no guardemos slugs (ni tokens de listas privadas) en Mongo.
 */
export function webVitalRouteGroup(pathname: string): WebVitalRouteGroup {
  const path = (pathname || "/").split("?")[0].replace(/\/+$/, "") || "/"
  if (path === "/") return "home"
  if (path === "/mapa" || path.startsWith("/mapa-")) return "mapa"
  if (path.startsWith("/lugar/")) return "lugar"
  if (path.startsWith("/sin-gluten/provincia/")) return "provincia"
  if (path.startsWith("/sin-gluten/") || path.startsWith("/top-sin-gluten/")) return "ciudad"
  if (path.startsWith("/categoria/")) return "categoria"
  if (path === "/explorar") return "explorar"
  if (path === "/emprendimientos" || path.startsWith("/emprendimientos/")) return "emprendimientos"
  if (path === "/listas" || path.startsWith("/listas/")) return "listas"
  if (path === "/guias" || path.startsWith("/guias/")) return "guias"
  if (path === "/favoritos") return "favoritos"
  if (path === "/perfil") return "perfil"
  if (path === "/sugerir" || path === "/sugerir-emprendimiento") return "sugerir"
  if (INSTITUTIONAL.has(path)) return "institucional"
  return "otras"
}

/** Percentil con interpolación lineal (p entre 0 y 1). */
export function percentile(values: number[], p: number): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b)
  if (sorted.length === 0) return null
  if (sorted.length === 1) return sorted[0]
  const rank = Math.min(Math.max(p, 0), 1) * (sorted.length - 1)
  const low = Math.floor(rank)
  const high = Math.ceil(rank)
  const frac = rank - low
  return sorted[low] + (sorted[high] - sorted[low]) * frac
}

/** web = navegador (incluye PWA instalada); app = WebView de Capacitor. */
export type WebVitalAudience = "app" | "web_mobile" | "web_desktop"

export function webVitalAudience(platform: string, device: string): WebVitalAudience {
  if (platform === "ios_native" || platform === "android_native") return "app"
  return device === "desktop" ? "web_desktop" : "web_mobile"
}

export const WEB_VITAL_AUDIENCE_LABELS: Record<WebVitalAudience, string> = {
  app: "App (iOS y Android)",
  web_mobile: "Web en celular",
  web_desktop: "Web en compu",
}

/**
 * Cuántas visitas hay detrás de una fila: el máximo de mediciones entre las
 * métricas. TTFB sale en casi todas las cargas; LCP o FCP no salen si la página
 * se abrió en segundo plano o se cerró antes de pintar.
 */
export function webVitalRowSamples(
  metrics: Partial<Record<WebVitalMetric, { samples: number }>>
): number {
  return Math.max(0, ...Object.values(metrics).map((cell) => cell?.samples ?? 0))
}
