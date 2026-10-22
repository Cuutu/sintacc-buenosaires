"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ChevronRight, Inbox, Mail, MessageSquareText, Store } from "lucide-react"
import type { AdminCounts, AdminOpsSnapshot } from "@/lib/admin-ops"
import { adminUi } from "@/lib/admin-ui"
import { formatCount } from "@/lib/admin-format"
import { cn } from "@/lib/utils"
import { AdminPageHeader, AdminSectionTitle } from "@/components/admin/ui/page-header"
import { AdminLinkButton } from "@/components/admin/ui/button"
import { filterChipClass } from "@/components/admin/ui/filter-chip"
import { StatTile } from "@/components/admin/ui/states"

/** Atajos de "Completar lugares", con cuántos publicados les falta cada cosa. */
export const COMPLETE_SHORTCUTS: Array<{ filter: string; label: string; count: keyof AdminCounts }> = [
  { filter: "photo", label: "Sin foto", count: "placesNoPhoto" },
  { filter: "hours", label: "Sin horarios", count: "placesNoHours" },
  { filter: "instagram", label: "Sin Instagram", count: "placesNoInstagram" },
  { filter: "phone", label: "Sin teléfono", count: "placesNoPhone" },
  { filter: "web", label: "Sin web", count: "placesNoWeb" },
  { filter: "description", label: "Sin descripción", count: "placesNoDescription" },
  { filter: "coords", label: "Sin coordenadas", count: "placesNoCoords" },
  { filter: "incomplete", label: "Sin estado TACC", count: "placesIncomplete" },
]

/** Lo que espera una respuesta del equipo. */
export const INBOX_ROWS: Array<{ label: string; count: keyof AdminCounts; href: string; icon: typeof Inbox }> = [
  { label: "Lugares en la cola", count: "suggestionsPending", href: "/admin/lugares?cola=1", icon: Inbox },
  { label: "Emprendimientos en la cola", count: "ventureSuggestionsPending", href: "/admin/emprendimientos?cola=1", icon: Store },
  { label: "Reseñas pendientes", count: "reviewsPending", href: "/admin/resenas?estado=pendiente", icon: MessageSquareText },
  { label: "Mensajes pendientes", count: "contactsPending", href: "/admin/mensajes?estado=pendiente", icon: Mail },
]

export function OpsDashboard({ initial }: { initial: AdminOpsSnapshot }) {
  const [data, setData] = useState(initial)
  useEffect(() => {
    let active = true
    const refresh = () => fetch("/api/admin/ops").then(r => r.ok ? r.json() : null).then(next => { if (active && next) setData(next) }).catch(() => undefined)
    window.addEventListener("admin:counts-changed", refresh)
    return () => { active = false; window.removeEventListener("admin:counts-changed", refresh) }
  }, [])

  const c = data.counts
  const pendingPlaces = Math.max(0, (c.placesTotal ?? 0) - (c.placesApproved ?? 0))
  const inboxTotal = INBOX_ROWS.reduce((sum, row) => sum + Number(c[row.count] ?? 0), 0)

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <AdminPageHeader
        title="Inicio"
        description="Todo lo que necesitás para mantener CeliMap completo, actualizado y útil."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Números clave">
        <StatTile label="Publicados" value={formatCount(c.placesApproved ?? 0)} hint="En el mapa ahora" />
        <Link href="/admin/lugares?status=pending" className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive/40">
          <StatTile
            label="Pendientes"
            value={formatCount(pendingPlaces)}
            hint="Sin publicar · ver →"
            tone={pendingPlaces > 0 ? "warning" : "default"}
          />
        </Link>
        <StatTile label="Nuevos esta semana" value={formatCount(c.placesNewWeek ?? 0)} hint="Lugares cargados en 7 días" />
        <StatTile
          label="Calidad CeliMap"
          value={data.qualityScore == null ? "—" : `${data.qualityScore}/100`}
          hint={<span title={data.qualityExplain}>Fichas completas en promedio</span>}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={cn(adminUi.card, "p-5")} aria-labelledby="dash-inbox">
          <div id="dash-inbox">
            <AdminSectionTitle hint={inboxTotal === 0 ? "No hay nada esperando. Buen trabajo." : "Lo que espera una respuesta."}>
              Para resolver
            </AdminSectionTitle>
          </div>
          <ul className="mt-3 divide-y divide-line">
            {INBOX_ROWS.map((row) => {
              const n = Number(c[row.count] ?? 0)
              const Icon = row.icon
              return (
                <li key={row.href}>
                  <Link
                    href={row.href}
                    className="flex min-h-12 items-center gap-3 rounded-xl px-1 py-2 text-sm text-olive transition-colors hover:bg-olive/6"
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 text-ink-muted" aria-hidden />
                    <span className="min-w-0 flex-1">{row.label}</span>
                    <span
                      className={cn(
                        "min-w-8 rounded-full px-2 py-0.5 text-center text-sm font-bold tabular-nums",
                        n > 0 ? "bg-warning-soft text-warning" : "text-ink-muted"
                      )}
                    >
                      {formatCount(n)}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={cn(adminUi.card, "p-5")} aria-labelledby="dash-complete">
          <div id="dash-complete">
            <AdminSectionTitle hint="Lugares publicados a los que les falta algo.">Completar lugares</AdminSectionTitle>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {COMPLETE_SHORTCUTS.map((s) => (
              <Link key={s.filter} href={`/admin/lugares?missing=${s.filter}&status=approved`} className={filterChipClass(false)}>
                {s.label}
                <span className="rounded-full bg-olive/8 px-1.5 text-xs font-semibold tabular-nums text-ink-muted">
                  {formatCount(Number(c[s.count] ?? 0))}
                </span>
              </Link>
            ))}
          </div>
          <AdminLinkButton href="/admin/lugares" variant="secondary" className="mt-4">
            Ver lugares
          </AdminLinkButton>
        </section>
      </div>
    </div>
  )
}
