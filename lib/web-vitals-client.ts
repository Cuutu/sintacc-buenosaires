import { enqueueFirstPartyEvent } from "@/lib/analytics-client"
import {
  isWebVitalMetric,
  roundWebVitalValue,
  webVitalRouteGroup,
  type WebVitalRouteGroup,
} from "@/lib/web-vitals"

/** Lo mínimo que usamos del `Metric` de web-vitals (next/web-vitals). */
export type ReportedWebVital = {
  name: string
  value: number
  rating?: string
  navigationType?: string
}

// Las métricas describen la carga dura de la página (LCP, FCP, TTFB) o toda su
// vida (CLS, INP). Las atribuimos a la ruta por la que entró el usuario, no a
// la que tenga abierta cuando se reportan al cerrar la pestaña.
let entryRoute: WebVitalRouteGroup | null = null

export function reportWebVital(metric: ReportedWebVital): void {
  if (typeof window === "undefined") return
  if (!isWebVitalMetric(metric.name)) return
  if (entryRoute == null) {
    entryRoute = webVitalRouteGroup(window.location.pathname)
  }
  const props: Record<string, string | number> = {
    metric: metric.name,
    value: roundWebVitalValue(metric.name, metric.value),
    route: entryRoute,
  }
  if (metric.rating) props.rating = metric.rating
  if (metric.navigationType) props.navType = metric.navigationType
  enqueueFirstPartyEvent("web_vital", props)
}

export function __resetWebVitalsClientForTests(): void {
  entryRoute = null
}
