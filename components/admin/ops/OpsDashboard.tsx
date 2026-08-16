"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { AdminOpsSnapshot } from "@/lib/admin-ops"
import type { AttentionTone } from "@/lib/admin-quality"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"

function timeAgo(iso?: string): string {
  if (!iso) return "Sin actividad"
  const delta = Date.now() - new Date(iso).getTime()
  const min = Math.max(1, Math.round(delta / 60000))
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  return `hace ${Math.round(h / 24)} d`
}

const TONE_DOT: Record<AttentionTone, string> = {
  critical: "bg-[#C85A2E]",
  warn: "bg-[#C47A2C]",
  improve: "bg-[#D4A017]",
  ok: "bg-[#2D6A4F]",
}

function formatCount(n: number): string {
  return n.toLocaleString("es-AR")
}

export function OpsDashboard({ initial }: { initial: AdminOpsSnapshot }) {
  const [data, setData] = useState(initial)

  useEffect(() => {
    fetch("/api/admin/ops")
      .then((r) => (r.ok ? r.json() : null))
      .then((next) => {
        if (next) setData(next)
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="mx-auto max-w-[1280px]">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className={adminUi.title}>Centro de operaciones</h1>
          <p className={cn("mt-2", adminUi.subtitle)}>
            Todo lo que necesitás para mantener CeliMap completo, actualizado y útil.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sugerir" className={adminUi.btnPrimary}>
            Agregar lugar
          </Link>
          <Link href="/sugerir-emprendimiento" className={adminUi.btnGhost}>
            Publicar marca
          </Link>
        </div>
      </header>

      <section aria-labelledby="quality-score-heading" className="mb-10">
        <article className={cn(adminUi.card, "p-6 sm:p-7")}>
          <p className={adminUi.label}>Calidad CeliMap</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p id="quality-score-heading" className="font-display text-5xl font-extrabold tabular-nums tracking-[-0.04em] text-[#234A33]">
                {data.qualityScore == null ? "—" : `${data.qualityScore}/100`}
              </p>
              <p className="mt-2 text-sm font-medium text-[#234A33]">Calidad de la base</p>
              <p className="mt-1 text-sm text-[#6B746C]">
                {formatCount(data.counts.placesApproved)} lugares publicados
              </p>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[#6B746C]">{data.qualityExplain}</p>
          </div>
        </article>
      </section>

      <section aria-labelledby="attention-heading" className="mb-10">
        <h2 id="attention-heading" className={cn("mb-4", adminUi.label)}>
          Necesita atención
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {data.attention.map((row) => (
            <article key={row.id} className={cn(adminUi.card, "flex items-center justify-between gap-3 p-5")}>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#234A33]">
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[row.tone])} aria-hidden />
                  {formatCount(row.count)} {row.label}
                </p>
              </div>
              {row.count > 0 ? (
                <Link href={row.href} className={adminUi.btnGhost}>
                  Ver lugares
                </Link>
              ) : (
                <span className="text-sm font-medium text-[#2D6A4F]">OK</span>
              )}
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="priority-heading" className="mb-10">
        <h2 id="priority-heading" className={cn("mb-4", adminUi.label)}>
          Qué debería resolver primero
        </h2>
        {data.priority.length === 0 ? (
          <article className={cn(adminUi.card, "p-5")}>
            <p className="text-sm font-semibold text-[#234A33]">
              Priorización disponible cuando haya suficientes datos de actividad
            </p>
            <p className="mt-1 text-sm text-[#6B746C]">
              Hoy no hay huecos publicados o faltan señales de popularidad para ordenar el trabajo.
            </p>
          </article>
        ) : (
          <div className="space-y-3">
            {data.priority.map((item) => (
              <article
                key={item.id}
                className={cn(adminUi.card, "flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between")}
              >
                <div>
                  <p className={adminUi.label}>
                    {item.level === "alta" ? "Prioridad alta" : "Prioridad media"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#234A33]">{item.title}</p>
                  <p className="mt-1 text-sm text-[#6B746C]">{formatCount(item.count)} lugares</p>
                </div>
                <Link href={item.href} className={adminUi.btnGhost}>
                  Ver lista
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="inbox-heading" className="mb-10">
        <h2 id="inbox-heading" className={cn("mb-4", adminUi.label)}>
          Pendientes
        </h2>
        <div className="space-y-3">
            {data.inbox.map((card) => (
              <article
                key={card.id}
                className={cn(adminUi.card, "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between")}
              >
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-[#234A33]">{card.title}</h3>
                  <p className="mt-1 text-sm text-[#6B746C]">
                    {card.count > 0 && card.staleDays != null && card.staleDays >= 2
                      ? `${card.staleDays} días sin resolver`
                      : timeAgo(card.lastAt)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "text-3xl font-semibold tabular-nums",
                      card.count > 0 ? "text-[#C85A2E]" : "text-[#6B746C]"
                    )}
                  >
                    {card.count}
                  </span>
                  <Link href={card.href} className={adminUi.btnGhost}>
                    Revisar
                  </Link>
                </div>
              </article>
            ))}
        </div>
      </section>

      <section aria-labelledby="activity-heading" className="mb-10">
        <h2 id="activity-heading" className={cn("mb-4", adminUi.label)}>
          Actividad reciente
        </h2>
        <ol className={adminUi.card}>
          {data.activity.length === 0 ? (
            <li className="px-5 py-6 text-sm text-[#6B746C]">Todavía no hay movimiento.</li>
          ) : (
            data.activity.map((item) => (
              <li key={item.id} className="border-b border-[#E8E1D6] last:border-0">
                <Link href={item.href} className="flex items-baseline justify-between gap-3 px-5 py-3.5">
                  <span className="min-w-0">
                    <span className="block text-sm text-[#234A33]">{item.title}</span>
                    <span className="mt-0.5 block truncate text-sm text-[#6B746C]">{item.detail}</span>
                    {item.status ? (
                      <span className="mt-1 block text-xs capitalize text-[#6B746C]">{item.status}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-[#6B746C]">{timeAgo(item.at)}</span>
                </Link>
              </li>
            ))
          )}
        </ol>
      </section>

      <section aria-labelledby="quick-heading">
        <h2 id="quick-heading" className={cn("mb-4", adminUi.label)}>
          Accesos rápidos
        </h2>
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
          data-overflow-allowed="admin-ops-quick"
        >
          {[
            { href: "/sugerir", label: "Agregar lugar" },
            { href: "/admin/lugares", label: "Editar lugar" },
            { href: "/admin/lugares?google=1", label: "Importar desde Google" },
            { href: "/admin/destacados", label: "Crear destacado" },
            { href: "/admin/guias", label: "Crear guía" },
            { href: "/admin/analytics", label: "Analytics" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className={cn(adminUi.chip, "shrink-0")}>
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
