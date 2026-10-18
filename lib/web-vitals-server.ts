import connectDB from "@/lib/mongodb"
import { ProductEvent } from "@/models/ProductEvent"
import type { InsightsRangeKey } from "@/lib/admin-insights-types"
import {
  WEB_VITAL_METRICS,
  WEB_VITAL_ROUTE_GROUPS,
  isWebVitalMetric,
  percentile,
  rateWebVital,
  webVitalAudience,
  type WebVitalAudience,
  type WebVitalMetric,
  type WebVitalRating,
} from "@/lib/web-vitals"

const RANGE_DAYS: Record<InsightsRangeKey, number> = { "1d": 1, "7d": 7, "30d": 30 }
/** Tope de documentos leídos por consulta: el admin no necesita más para un p75. */
const MAX_SAMPLES = 50_000

export type WebVitalCell = { p75: number; samples: number; rating: WebVitalRating }

export type WebVitalsRow = {
  route: string
  audience: WebVitalAudience
  metrics: Partial<Record<WebVitalMetric, WebVitalCell>>
}

export type WebVitalsSummary = {
  range: InsightsRangeKey
  from: string
  to: string
  /** Cargas de página distintas no se pueden contar; esto es la cantidad de mediciones. */
  samples: number
  truncated: boolean
  rows: WebVitalsRow[]
}

type RawVital = { platform?: string; device?: string; props?: Record<string, unknown> }

export function summarizeWebVitals(docs: RawVital[]): WebVitalsRow[] {
  const buckets = new Map<string, { route: string; audience: WebVitalAudience; values: Map<WebVitalMetric, number[]> }>()

  const push = (route: string, audience: WebVitalAudience, metric: WebVitalMetric, value: number) => {
    const key = `${route}|${audience}`
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = { route, audience, values: new Map() }
      buckets.set(key, bucket)
    }
    const list = bucket.values.get(metric) ?? []
    list.push(value)
    bucket.values.set(metric, list)
  }

  for (const doc of docs) {
    const metric = doc.props?.metric
    const value = Number(doc.props?.value)
    if (!isWebVitalMetric(metric) || !Number.isFinite(value) || value < 0) continue
    const route = typeof doc.props?.route === "string" ? doc.props.route : "otras"
    const audience = webVitalAudience(doc.platform ?? "", doc.device ?? "")
    push(route, audience, metric, value)
    push("todas", audience, metric, value)
  }

  const routeOrder = ["todas", ...WEB_VITAL_ROUTE_GROUPS] as string[]
  const audienceOrder: WebVitalAudience[] = ["web_mobile", "app", "web_desktop"]

  return Array.from(buckets.values())
    .map((bucket) => {
      const metrics: WebVitalsRow["metrics"] = {}
      for (const metric of WEB_VITAL_METRICS) {
        const values = bucket.values.get(metric)
        if (!values?.length) continue
        const p75 = percentile(values, 0.75) ?? 0
        const rounded = metric === "CLS" ? Math.round(p75 * 1000) / 1000 : Math.round(p75)
        metrics[metric] = { p75: rounded, samples: values.length, rating: rateWebVital(metric, rounded) }
      }
      return { route: bucket.route, audience: bucket.audience, metrics }
    })
    .sort((a, b) => {
      const byAudience = audienceOrder.indexOf(a.audience) - audienceOrder.indexOf(b.audience)
      if (byAudience !== 0) return byAudience
      return routeOrder.indexOf(a.route) - routeOrder.indexOf(b.route)
    })
}

export async function getWebVitalsSummary(range: InsightsRangeKey, now = new Date()): Promise<WebVitalsSummary> {
  const from = new Date(now.getTime() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000)
  await connectDB()
  const docs = await ProductEvent.find({ name: "web_vital", ts: { $gte: from, $lte: now } })
    .select({ _id: 0, platform: 1, device: 1, props: 1 })
    .sort({ ts: -1 })
    .limit(MAX_SAMPLES)
    .lean<RawVital[]>()

  return {
    range,
    from: from.toISOString(),
    to: now.toISOString(),
    samples: docs.length,
    truncated: docs.length >= MAX_SAMPLES,
    rows: summarizeWebVitals(docs),
  }
}
