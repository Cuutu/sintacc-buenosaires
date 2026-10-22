"use client"

import type { ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { AdminDashboard } from "@/components/admin/AdminDashboard"
import type { AdminCounts, AdminSection } from "@/components/admin/types"
import { AdminPageHeader } from "@/components/admin/ui/page-header"
import { SegmentedControl } from "@/components/admin/ui/segmented-control"

type Tab = { id: AdminSection; label: string; query?: string; count?: number | null }

export function AdminModulePage({
  title,
  subtitle,
  counts,
  tabs,
  defaultSection,
  actions,
}: {
  title: string
  subtitle?: string
  counts: AdminCounts
  tabs: Tab[]
  defaultSection: AdminSection
  actions?: ReactNode
}) {
  const params = useSearchParams()
  const cola = params.get("cola")
  const incompletos = params.get("incompletos")
  const google = params.get("google")
  const status = params.get("status")

  let section = defaultSection
  if (cola && tabs.some((t) => t.id === "suggestions" || t.id === "ventureSuggestions")) {
    section = tabs.find((t) => t.id === "suggestions" || t.id === "ventureSuggestions")?.id ?? defaultSection
  }
  if (
    incompletos ||
    google ||
    params.get("sinFoto") ||
    params.get("sinHorarios") ||
    params.get("missing") ||
    params.get("editar") ||
    params.get("popular") ||
    params.get("sinInstagram") ||
    params.get("sinCoords")
  ) {
    section = "places"
  }
  if (status && tabs.some((t) => t.id === "reviews")) section = "reviews"
  if (params.get("seccion") === "ventureReviews" && tabs.some(t => t.id === "ventureReviews")) section = "ventureReviews"

  return (
    <div className="mx-auto max-w-[1280px]">
      <AdminPageHeader
        title={title}
        description={subtitle}
        actions={
          <>
            {tabs.length > 1 ? (
              <SegmentedControl
                ariaLabel={`Secciones de ${title}`}
                value={section}
                options={tabs.map((tab) => ({
                  value: tab.id,
                  label: tab.label,
                  count: tab.count,
                  href: (() => {
                    const query = new URLSearchParams(tab.query || "")
                    if (params.get("estado")) query.set("estado", params.get("estado")!)
                    if (tab.id === "ventureReviews") query.set("seccion", "ventureReviews")
                    return `?${query}`
                  })(),
                }))}
              />
            ) : null}
            {actions}
          </>
        }
      />
      <AdminDashboard
        key={`${section}:${params.toString()}`}
        initialCounts={counts}
        initialSection={section}
        hideLauncher
      />
    </div>
  )
}
