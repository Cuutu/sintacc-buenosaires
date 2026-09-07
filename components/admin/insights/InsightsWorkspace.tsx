"use client"

import { useCallback, useEffect, useState } from "react"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"
import type { AdminCounts } from "@/lib/admin-ops"
import type {
  AdminInsightsPayload,
  InsightsCountRow,
  InsightsMetric,
  InsightsRangeKey,
} from "@/lib/admin-insights-types"

type TabId = "resumen" | "adquisicion" | "comportamiento" | "retencion" | "errores" | "catalogo"

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "adquisicion", label: "Adquisición" },
  { id: "comportamiento", label: "Comportamiento" },
  { id: "retencion", label: "Retención" },
  { id: "errores", label: "Errores" },
  { id: "catalogo", label: "Catálogo" },
]

const RANGES: Array<{ id: InsightsRangeKey; label: string }> = [
  { id: "1d", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
]

function formatNumber(value: number): string {
  return value.toLocaleString("es-AR")
}

function Delta({ metric }: { metric: InsightsMetric }) {
  if (metric.deltaPct == null) {
    return <p className="mt-2 text-xs text-[#6B746C]">Sin período anterior comparable</p>
  }
  const up = metric.deltaPct >= 0
  return (
    <p className={cn("mt-2 text-xs font-medium", up ? "text-[#2F6B45]" : "text-[#A84A26]")}>
      {up ? "+" : ""}
      {metric.deltaPct}% vs período anterior
    </p>
  )
}

function MetricCard({
  label,
  metric,
  hint,
  empty,
}: {
  label: string
  metric: InsightsMetric
  hint?: string
  empty?: string
}) {
  const isEmpty = metric.value === 0 && metric.previous === 0
  return (
    <article className={`${adminUi.card} p-5`}>
      <p className="text-sm text-[#6B746C]">{label}</p>
      {isEmpty ? (
        <>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-[#234A33]/35">—</p>
          <p className="mt-2 text-xs text-[#6B746C]">{empty || "Todavía no hay datos en este período."}</p>
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-[#234A33]">
            {formatNumber(metric.value)}
          </p>
          <Delta metric={metric} />
        </>
      )}
      {hint ? <p className="mt-2 text-xs text-[#6B746C]">{hint}</p> : null}
    </article>
  )
}

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${adminUi.card} h-[132px] animate-pulse p-5`}>
          <div className="h-3 w-24 rounded bg-[#E8E1D6]" />
          <div className="mt-4 h-8 w-16 rounded bg-[#E8E1D6]" />
          <div className="mt-3 h-3 w-40 rounded bg-[#E8E1D6]" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className={`${adminUi.card} p-8`}>
      <p className="font-medium text-[#234A33]">{title}</p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#6B746C]">{body}</p>
    </div>
  )
}

function RankList({
  title,
  rows,
  empty,
}: {
  title: string
  rows: InsightsCountRow[]
  empty: string
}) {
  const max = rows[0]?.count ?? 0
  return (
    <article className={`${adminUi.card} p-5`}>
      <h3 className={adminUi.label}>{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-[#6B746C]">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-medium text-[#234A33]">{row.label}</p>
                <p className="shrink-0 text-sm tabular-nums text-[#6B746C]">{formatNumber(row.count)}</p>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#E8E1D6]">
                <div
                  className="h-full rounded-full bg-[#234A33]"
                  style={{ width: max ? `${Math.max(8, (row.count / max) * 100)}%` : "0%" }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={`${adminUi.card} flex flex-wrap items-center justify-between gap-3 p-5`}>
      <p className="text-sm text-[#A84A26]">{message}</p>
      <button type="button" className={adminUi.btnGhost} onClick={onRetry}>
        Reintentar
      </button>
    </div>
  )
}

export function InsightsWorkspace({ catalog }: { catalog: AdminCounts }) {
  const [range, setRange] = useState<InsightsRangeKey>("7d")
  const [tab, setTab] = useState<TabId>("resumen")
  const [data, setData] = useState<AdminInsightsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (nextRange: InsightsRangeKey) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/insights?range=${nextRange}`)
      if (!res.ok) throw new Error("fail")
      const json = (await res.json()) as AdminInsightsPayload
      setData(json)
    } catch {
      setError("No pudimos cargar insights. Revisá la conexión e intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(range)
  }, [load, range])

  const catalogRows = [
    { label: "Lugares publicados", value: catalog.placesApproved, note: "Fichas con status aprobado." },
    { label: "Lugares totales", value: catalog.placesTotal, note: "Incluye pendientes." },
    { label: "Sugerencias pendientes", value: catalog.suggestionsPending, note: "Cola de locales." },
    { label: "Marcas por validar", value: catalog.ventureSuggestionsPending, note: "Cola de emprendimientos." },
    { label: "Destacados activos", value: catalog.featuredCount, note: "Selección manual del admin." },
    { label: "Mensajes pendientes", value: catalog.contactsPending, note: "Bandeja de contacto." },
    { label: "Reseñas ocultas", value: catalog.reviewsHidden, note: "Reportes o moderación." },
    { label: "Lugares sin foto", value: catalog.placesNoPhoto, note: "Hueco de calidad, no tráfico." },
    { label: "Lugares sin horarios", value: catalog.placesNoHours, note: "Hueco de calidad, no tráfico." },
  ]

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={adminUi.title}>Insights</h1>
          <p className={`mt-2 max-w-2xl ${adminUi.subtitle}`}>
            Números para decidir qué ciudades y tipos de lugar conviene sumar. Cuentas, reseñas y
            favoritos salen de la base. El resto, de eventos anónimos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setRange(item.id)}
              className={item.id === range ? adminUi.chipActive : adminUi.chip}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={item.id === tab ? adminUi.chipActive : adminUi.chip}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {error ? <ErrorBanner message={error} onRetry={() => void load(range)} /> : null}

        {tab === "catalogo" ? (
          <section>
            <h2 className={adminUi.label}>Inventario actual</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {catalogRows.map((row) => (
                <article key={row.label} className={`${adminUi.card} p-5`}>
                  <p className="text-sm text-[#6B746C]">{row.label}</p>
                  <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-[#234A33]">
                    {formatNumber(row.value)}
                  </p>
                  <p className="mt-2 text-xs text-[#6B746C]">{row.note}</p>
                </article>
              ))}
            </div>
          </section>
        ) : loading || !data ? (
          <SkeletonGrid />
        ) : tab === "resumen" ? (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Activos en el período"
              metric={data.overview.activeRange}
              hint="Dispositivos anónimos con al menos un evento."
              empty="Cuando haya uso real, acá ves cuánta gente abre CeliMap."
            />
            <MetricCard
              label="Activos hoy"
              metric={data.overview.activeToday}
              empty="Nadie activo todavía hoy."
            />
            <MetricCard
              label="Cuentas nuevas"
              metric={data.overview.newAccounts}
              hint="Altas reales en Mongo (Google / Apple)."
            />
            <MetricCard
              label="Dispositivos nuevos"
              metric={data.overview.newDevices}
              hint="first_open. No es lo mismo que una cuenta."
            />
            <MetricCard
              label="Recurrentes"
              metric={data.overview.returning}
              hint="Activos menos dispositivos nuevos del período."
            />
            <MetricCard label="Fichas vistas" metric={data.overview.placeViews} />
            <MetricCard label="Búsquedas" metric={data.overview.searches} />
            <MetricCard
              label="Reseñas creadas"
              metric={data.overview.reviews}
              hint="Desde la base, no desde el evento."
            />
            <MetricCard
              label="Favoritos nuevos"
              metric={data.overview.favorites}
              hint="Desde la base."
            />
            <MetricCard
              label="Lugares sugeridos"
              metric={data.overview.suggestions}
              hint="Sugerencias enviadas, no el click del CTA."
            />
            <MetricCard label="Clics en cómo llegar" metric={data.overview.directions} />
          </section>
        ) : tab === "adquisicion" ? (
          !data.acquisition.available ? (
            <EmptyState
              title="Todavía no hay atribución"
              body="Fuente, campaña y ciudad aparecen cuando llegan eventos first-party. País y ciudad salen del header de Vercel, no del GPS. En local casi siempre viene vacío."
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[#6B746C]">{data.acquisition.note}</p>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <RankList
                  title="Fuente"
                  rows={data.acquisition.sources}
                  empty="Sin fuente todavía. Usá utm_source en links de Instagram/TikTok."
                />
                <RankList
                  title="Medio"
                  rows={data.acquisition.mediums}
                  empty="Sin medio. utm_medium o referrer."
                />
                <RankList
                  title="Campaña"
                  rows={data.acquisition.campaigns}
                  empty="Sin utm_campaign en las URLs de entrada."
                />
                <RankList
                  title="Página de entrada"
                  rows={data.acquisition.entryPaths}
                  empty="Sin path de primera visita."
                />
                <RankList
                  title="País"
                  rows={data.acquisition.countries}
                  empty="Vercel no mandó país. Normal en local."
                />
                <RankList
                  title="Provincia / región"
                  rows={data.acquisition.regions}
                  empty="Sin región IP."
                />
                <RankList
                  title="Ciudad (IP)"
                  rows={data.acquisition.cities}
                  empty="Sin ciudad IP. No se inventa ni se usa el GPS del mapa."
                />
                <RankList
                  title="Dispositivo"
                  rows={data.acquisition.devices}
                  empty="Sin user-agent clasificable."
                />
                <RankList
                  title="Plataforma"
                  rows={data.acquisition.platforms}
                  empty="web / pwa / ios_native / android_native."
                />
              </div>
            </div>
          )
        ) : tab === "comportamiento" ? (
          !data.behavior.available ? (
            <EmptyState
              title="Todavía no hay comportamiento"
              body="Las fichas, búsquedas y filtros se llenan solos cuando la gente usa el mapa. Las reseñas y favoritos de este período ya se leen de la base."
            />
          ) : (
            <div className="space-y-4">
              {data.behavior.zeroSearches.length > 0 ? (
                <article className={`${adminUi.card} border-[#C85A2E]/25 p-5`}>
                  <h3 className={adminUi.label}>Búsquedas sin resultados</h3>
                  <p className="mt-2 text-sm text-[#6B746C]">
                    Huecos de cobertura. Si se repite una ciudad o un tipo de lugar, conviene cargarlo.
                  </p>
                  <ul className="mt-4 space-y-3">
                    {data.behavior.zeroSearches.map((row) => (
                      <li key={row.query} className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-[#234A33]">“{row.query}”</p>
                        <p className="text-sm tabular-nums text-[#A84A26]">
                          {formatNumber(row.count)} sin resultados
                        </p>
                      </li>
                    ))}
                  </ul>
                </article>
              ) : (
                <EmptyState
                  title="Sin búsquedas vacías en este período"
                  body="Cuando alguien busque algo que el mapa no tiene, aparece acá."
                />
              )}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <RankList
                  title="Lugares más vistos"
                  rows={data.behavior.topPlaces.map((row) => ({
                    key: row.placeId,
                    label: row.city ? `${row.name} · ${row.city}` : row.name,
                    count: row.views,
                  }))}
                  empty="Nadie abrió una ficha todavía."
                />
                <RankList
                  title="Categorías"
                  rows={data.behavior.topCategories}
                  empty="Sin vistas de ficha con categoría."
                />
                <RankList
                  title="Ciudades consultadas"
                  rows={data.behavior.topCities}
                  empty="Las búsquedas y fichas todavía no traen ciudad."
                />
                <RankList
                  title="Filtros"
                  rows={data.behavior.topFilters}
                  empty="Nadie aplicó tipo, barrio o nivel de seguridad."
                />
                <RankList
                  title="Búsquedas frecuentes"
                  rows={data.behavior.topSearches.map((row) => ({
                    key: row.query,
                    label:
                      row.resultCountAvg == null
                        ? row.query
                        : `${row.query} · ~${row.resultCountAvg} resultados`,
                    count: row.count,
                  }))}
                  empty="Sin búsquedas de texto todavía."
                />
              </div>
            </div>
          )
        ) : tab === "retencion" ? (
          !data.retention.available ? (
            <EmptyState
              title="Todavía no hay retención"
              body="D1 / D7 / D30 se calculan con first_open y la vuelta del mismo dispositivo anónimo. Hace falta una semana de uso real y al menos 5 dispositivos en la cohorte."
            />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[#6B746C]">{data.retention.note}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <article className={`${adminUi.card} p-5`}>
                  <p className="text-sm text-[#6B746C]">Dispositivos nuevos</p>
                  <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-[#234A33]">
                    {formatNumber(data.retention.newDevices)}
                  </p>
                </article>
                <article className={`${adminUi.card} p-5`}>
                  <p className="text-sm text-[#6B746C]">Recurrentes</p>
                  <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-[#234A33]">
                    {formatNumber(data.retention.returning)}
                  </p>
                </article>
                {[
                  { label: "Retención 1 día", value: data.retention.d1 },
                  { label: "Retención 7 días", value: data.retention.d7 },
                  { label: "Retención 30 días", value: data.retention.d30 },
                ].map((row) => (
                  <article key={row.label} className={`${adminUi.card} p-5`}>
                    <p className="text-sm text-[#6B746C]">{row.label}</p>
                    <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-[#234A33]">
                      {row.value == null ? "—" : `${row.value}%`}
                    </p>
                    {row.value == null ? (
                      <p className="mt-2 text-xs text-[#6B746C]">Cohorte chica o demasiado reciente.</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {!data.errors.available ? (
              <EmptyState
                title="Sin errores de producto en este período"
                body="Se miden fallos de login, carga del mapa y carga de ficha. Los crashes genéricos siguen en /api/client-errors (logs de Vercel). Sentry no está conectado a propósito: no duplicamos sinks."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <article className={`${adminUi.card} p-5`}>
                  <p className="text-sm text-[#6B746C]">Login</p>
                  <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-[#234A33]">
                    {formatNumber(data.errors.login)}
                  </p>
                </article>
                <article className={`${adminUi.card} p-5`}>
                  <p className="text-sm text-[#6B746C]">Mapa</p>
                  <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-[#234A33]">
                    {formatNumber(data.errors.mapLoad)}
                  </p>
                </article>
                <article className={`${adminUi.card} p-5`}>
                  <p className="text-sm text-[#6B746C]">Ficha</p>
                  <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-[#234A33]">
                    {formatNumber(data.errors.placeLoad)}
                  </p>
                </article>
              </div>
            )}
            {data.errors.recent.length > 0 ? (
              <article className={`${adminUi.card} p-5`}>
                <h3 className={adminUi.label}>Últimos</h3>
                <ul className="mt-4 space-y-3">
                  {data.errors.recent.map((row, index) => (
                    <li key={`${row.ts}-${index}`} className="text-sm text-[#234A33]">
                      <span className="font-medium">{row.name}</span>
                      {row.reason ? <span className="text-[#6B746C]"> · {row.reason}</span> : null}
                      {row.platform ? <span className="text-[#6B746C]"> · {row.platform}</span> : null}
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
