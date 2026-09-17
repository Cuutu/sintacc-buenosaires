"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import type { AdminOpsSnapshot } from "@/lib/admin-ops"
import { adminUi } from "@/lib/admin-ui"

const SHORTCUTS = [
  ["photo", "Sin foto"], ["hours", "Sin horarios"], ["instagram", "Sin Instagram"],
  ["phone", "Sin teléfono"], ["web", "Sin web"], ["description", "Sin descripción"],
  ["coords", "Sin coordenadas"], ["ficha", "Ficha incompleta"],
]

export function OpsDashboard({ initial }: { initial: AdminOpsSnapshot }) {
  const [data, setData] = useState(initial)
  useEffect(() => {
    let active = true
    const refresh = () => fetch("/api/admin/ops").then(r => r.ok ? r.json() : null).then(next => { if (active && next) setData(next) }).catch(() => undefined)
    window.addEventListener("admin:counts-changed", refresh)
    return () => { active = false; window.removeEventListener("admin:counts-changed", refresh) }
  }, [])
  return <div className="mx-auto max-w-5xl space-y-6">
    <header>
      <h1 className={adminUi.title}>Centro de operaciones</h1>
      <p className="mt-2 text-[#6B746C]">Todo lo que necesitás para mantener CeliMap completo, actualizado y útil.</p>
    </header>
    <section className="grid gap-4 lg:grid-cols-3" aria-label="Resumen">
      <div className={`${adminUi.card} p-6`}>
        <h2 className="text-sm font-semibold">Calidad CeliMap</h2>
        <p className="my-3 text-4xl font-bold text-[#234A33]">{data.qualityScore == null ? "—" : `${data.qualityScore}/100`}</p>
        <p className="text-sm text-[#6B746C]">{data.qualityExplain}</p>
      </div>
      <Link href="/admin/mensajes?estado=pendiente" className={`${adminUi.card} p-6 focus-visible:ring-2`}>
        <h2>Mensajes pendientes</h2><p className="mt-3 text-4xl font-bold">{data.counts.contactsPending}</p>
        <p className="mt-3 text-sm">Abrir bandeja →</p>
      </Link>
      <Link href="/admin/resenas?estado=pendiente" className={`${adminUi.card} p-6 focus-visible:ring-2`}>
        <h2>Reseñas pendientes</h2><p className="mt-3 text-4xl font-bold">{data.counts.reviewsPending}</p>
        <p className="mt-3 text-sm">Lugares y emprendimientos →</p>
      </Link>
    </section>
    <section className={`${adminUi.card} p-5`}>
      <h2 className="mb-4 font-semibold">Completar lugares</h2>
      <div className="flex flex-wrap gap-2">
        {SHORTCUTS.map(([filter, label]) => <Link key={filter} href={`/admin/lugares?missing=${filter}&status=approved`} className={`${adminUi.btnGhost} min-h-11`}>{label}</Link>)}
        <Link href="/admin/lugares" className={adminUi.btnPrimary}>Ver lugares</Link>
      </div>
    </section>
  </div>
}
