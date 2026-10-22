"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"
import type { InsightsRangeKey } from "@/lib/admin-insights-types"
import {
  WEB_VITAL_AUDIENCE_LABELS,
  WEB_VITAL_THRESHOLDS,
  webVitalRowSamples,
  type WebVitalAudience,
  type WebVitalMetric,
  type WebVitalRating,
} from "@/lib/web-vitals"
import type { WebVitalCell, WebVitalsSummary } from "@/lib/web-vitals-server"
import { AdminButton } from "@/components/admin/ui/button"
import { SegmentedControl } from "@/components/admin/ui/segmented-control"

const ROUTE_LABELS: Record<string, string> = {
  todas: "Todas las páginas",
  home: "Home",
  mapa: "Mapa",
  lugar: "Fichas de lugares",
  ciudad: "Landings de ciudad",
  provincia: "Landings de provincia",
  categoria: "Categorías",
  explorar: "Explorar",
  emprendimientos: "Emprendimientos",
  listas: "Listas",
  guias: "Guías",
  favoritos: "Favoritos",
  perfil: "Perfil",
  sugerir: "Sugerir",
  institucional: "Páginas institucionales",
  otras: "Otras",
}

const COLUMNS: Array<{ metric: WebVitalMetric; label: string; hint: string }> = [
  { metric: "LCP", label: "LCP", hint: "Cuánto tarda en verse lo principal" },
  { metric: "INP", label: "INP", hint: "Cuánto tarda en responder a un toque" },
  { metric: "CLS", label: "CLS", hint: "Cuánto salta el contenido" },
  { metric: "FCP", label: "FCP", hint: "Primer contenido en pantalla" },
  { metric: "TTFB", label: "TTFB", hint: "Respuesta del servidor" },
]

const AUDIENCES: WebVitalAudience[] = ["web_mobile", "app", "web_desktop"]

/** Pocas muestras: el p75 todavía no dice mucho. */
const MIN_SAMPLES = 20

const RATING_STYLE: Record<WebVitalRating, string> = {
  good: "bg-success-soft text-success",
  "needs-improvement": "bg-warning-soft text-warning",
  poor: "bg-danger-soft text-danger",
}

function formatValue(metric: WebVitalMetric, value: number): string {
  if (metric === "CLS") return value.toLocaleString("es-AR", { maximumFractionDigits: 3 })
  if (value >= 1000) return `${(value / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} s`
  return `${value.toLocaleString("es-AR")} ms`
}

function thresholdHint(metric: WebVitalMetric): string {
  const t = WEB_VITAL_THRESHOLDS[metric]
  return `Bueno ≤ ${formatValue(metric, t.good)} · malo > ${formatValue(metric, t.poor)}`
}

function Cell({ metric, cell }: { metric: WebVitalMetric; cell?: WebVitalCell }) {
  if (!cell) return <span className="text-ink-muted">—</span>
  const few = cell.samples < MIN_SAMPLES
  return (
    <span
      title={`${cell.samples} mediciones${few ? " (pocas todavía)" : ""}`}
      className={cn(
        "inline-flex min-w-[64px] justify-center rounded-full px-2 py-1 text-sm font-semibold tabular-nums",
        RATING_STYLE[cell.rating],
        few && "opacity-60"
      )}
    >
      {formatValue(metric, cell.p75)}
    </span>
  )
}

export function WebVitalsPanel({ range }: { range: InsightsRangeKey }) {
  const [audience, setAudience] = useState<WebVitalAudience>("web_mobile")
  const [data, setData] = useState<WebVitalsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (nextRange: InsightsRangeKey) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/web-vitals?range=${nextRange}`, { credentials: "same-origin" })
      if (res.status === 401 || res.status === 403) {
        setError("Entrá como admin para ver la velocidad.")
        return
      }
      if (!res.ok) throw new Error("fail")
      setData((await res.json()) as WebVitalsSummary)
    } catch {
      setError("No pudimos cargar la velocidad. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(range)
  }, [load, range])

  const rows = useMemo(
    () => (data?.rows ?? []).filter((row) => row.audience === audience),
    [data, audience]
  )

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-base font-bold text-olive">Velocidad con usuarios reales</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Cada número es el p75: 3 de cada 4 visitas cargaron igual o más rápido. Verde es bueno para
            Google, ámbar mejorable, rojo malo. Las celdas pálidas tienen menos de {MIN_SAMPLES} mediciones.
          </p>
        </div>
        <SegmentedControl
          ariaLabel="Dónde se midió"
          value={audience}
          onChange={setAudience}
          options={AUDIENCES.map((item) => ({ value: item, label: WEB_VITAL_AUDIENCE_LABELS[item] }))}
        />
      </div>

      {error ? (
        <div className={`${adminUi.card} flex flex-wrap items-center justify-between gap-3 p-5`}>
          <p className="text-sm text-danger">{error}</p>
          <AdminButton onClick={() => void load(range)}>Reintentar</AdminButton>
        </div>
      ) : loading || !data ? (
        <div className={`${adminUi.card} h-48 animate-pulse`} />
      ) : rows.length === 0 ? (
        <div className={`${adminUi.card} p-6`}>
          <p className="font-semibold text-olive">Todavía no hay mediciones para este grupo</p>
          <p className="mt-2 text-sm text-ink-muted">
            Se llenan solas a medida que la gente abre CeliMap. Con unos días de tráfico ya hay p75 confiables.
          </p>
        </div>
      ) : (
        <div className={`${adminUi.card} overflow-x-auto`}>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className={`px-5 py-3 ${adminUi.label}`}>Página</th>
                {COLUMNS.map((col) => (
                  <th key={col.metric} className={`px-3 py-3 ${adminUi.label}`} title={`${col.hint}. ${thresholdHint(col.metric)}`}>
                    {col.label}
                  </th>
                ))}
                <th className={`px-5 py-3 text-right ${adminUi.label}`}>Mediciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.audience}-${row.route}`}
                  className={cn("border-b border-line last:border-0", row.route === "todas" && "bg-cream")}
                >
                  <td className="px-5 py-3 font-medium text-olive">{ROUTE_LABELS[row.route] ?? row.route}</td>
                  {COLUMNS.map((col) => (
                    <td key={col.metric} className="px-3 py-3">
                      <Cell metric={col.metric} cell={row.metrics[col.metric]} />
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right tabular-nums text-ink-muted">
                    {webVitalRowSamples(row.metrics).toLocaleString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-ink-muted">
        Se mide la carga por la que entró cada visita (la primera página), agrupada por tipo de página.
        {data?.truncated ? " Se leyeron las 50.000 mediciones más recientes." : ""}
      </p>
    </section>
  )
}
