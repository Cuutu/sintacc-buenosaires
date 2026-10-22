import type { SeoMetric } from "@/lib/admin-seo"
import { AdminLinkButton } from "@/components/admin/ui/button"
import { AdminSectionTitle } from "@/components/admin/ui/page-header"
import { StatusBadge } from "@/components/admin/ui/status-badge"
import { formatCount } from "@/lib/admin-format"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"

/** Porcentaje entero, sin mentir en los bordes: 1 de 2.451 es "menos de 1 %", no "0 %". */
export function coveragePercent(value: number, total: number): number {
  if (total <= 0 || value <= 0) return 0
  const pct = (value / total) * 100
  if (pct >= 100) return 100
  return Math.min(99, Math.max(1, Math.round(pct)))
}

export function formatCoverage(value: number, total: number): string {
  if (total <= 0) return "—"
  if (value <= 0) return "0 %"
  const pct = (value / total) * 100
  if (pct < 1) return "menos de 1 %"
  return `${coveragePercent(value, total)} %`
}

/** Verde si está bien cubierto, ámbar a medias, terracota si falta casi todo. */
function coverageTone(pct: number, lowerIsBetter: boolean) {
  const good = lowerIsBetter ? 100 - pct : pct
  if (good >= 80) return { bar: "bg-success", text: "text-success" }
  if (good >= 40) return { bar: "bg-warning-bar", text: "text-warning" }
  return { bar: "bg-terracotta-strong", text: "text-terracotta-strong" }
}

function MetricRow({ metric }: { metric: SeoMetric }) {
  const value = metric.value ?? 0
  const hasTotal = metric.total != null && metric.total > 0
  const pct = hasTotal ? coveragePercent(value, metric.total!) : 0
  const tone = coverageTone(pct, Boolean(metric.lowerIsBetter))
  return (
    <li className="grid gap-3 border-b border-line py-4 first:pt-0 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_16rem_3.75rem] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-olive">{metric.label}</p>
        <p className="mt-0.5 text-sm text-ink-muted">{metric.note}</p>
      </div>
      {hasTotal ? (
        <div className="min-w-0" data-testid={`seo-${metric.id}`}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm tabular-nums text-ink-muted">
              {formatCount(value)} de {formatCount(metric.total!)}
            </span>
            <span className={cn("text-base font-bold tabular-nums", tone.text)}>{formatCoverage(value, metric.total!)}</span>
          </div>
          <div
            role="progressbar"
            aria-label={metric.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-line"
          >
            <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${value > 0 ? Math.max(pct, 1) : 0}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-[22px] font-extrabold tabular-nums text-olive sm:text-right" data-testid={`seo-${metric.id}`}>
          {formatCount(value)}
        </p>
      )}
      <div className="sm:justify-self-end">
        {metric.href ? (
          <AdminLinkButton href={metric.href} className="px-3">
            Ver
          </AdminLinkButton>
        ) : null}
      </div>
    </li>
  )
}

/** Vista de SEO: cobertura en % con barra; los números sueltos quedan para lo que no tiene total. */
export function AdminSeoCoverage({ ready, pending }: { ready: SeoMetric[]; pending: SeoMetric[] }) {
  const coverage = ready.filter((m) => m.total != null)
  const counts = ready.filter((m) => m.total == null)
  return (
    <div className="space-y-6">
      <section className={cn(adminUi.card, "p-5")}>
        <AdminSectionTitle hint="Qué parte de las fichas y de las páginas tiene cada dato.">Cobertura</AdminSectionTitle>
        <ul className="mt-4">
          {coverage.map((m) => (
            <MetricRow key={m.id} metric={m} />
          ))}
        </ul>
      </section>

      <section className={cn(adminUi.card, "p-5")}>
        <AdminSectionTitle>Números</AdminSectionTitle>
        <ul className="mt-4">
          {counts.map((m) => (
            <MetricRow key={m.id} metric={m} />
          ))}
        </ul>
      </section>

      <section className={cn(adminUi.card, "p-5")}>
        <AdminSectionTitle hint="Datos que todavía no medimos.">Falta medir</AdminSectionTitle>
        <ul className="mt-4">
          {pending.map((row) => (
            <li key={row.id} className="border-b border-line py-4 first:pt-0 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-olive">{row.label}</p>
                <StatusBadge tone="neutral" dot={false}>
                  Sin datos todavía
                </StatusBadge>
              </div>
              <p className="mt-1 text-sm text-ink-muted">{row.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
