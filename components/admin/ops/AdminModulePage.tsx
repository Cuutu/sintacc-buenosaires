"use client"

import type { ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import { AdminDashboard } from "@/components/admin/AdminDashboard"
import type { AdminCounts, AdminSection } from "@/components/admin/types"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"

type Tab = { id: AdminSection; label: string; query?: string }

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

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className={adminUi.title}>{title}</h1>
          {subtitle ? <p className={cn("mt-2", adminUi.subtitle)}>{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tabs.length > 1 ? (
            <div className="flex gap-1 rounded-[24px] border border-[#E8E1D6] bg-[#FCFBF8] p-1">
              {tabs.map((tab) => (
                <a
                  key={tab.id}
                  href={tab.query ? `?${tab.query}` : "?"}
                  className={cn(
                    "inline-flex h-10 items-center rounded-2xl px-3 text-sm font-medium transition-colors duration-150",
                    section === tab.id ? "bg-[#234A33] text-[#F8F5EF]" : "text-[#6B746C]"
                  )}
                >
                  {tab.label}
                </a>
              ))}
            </div>
          ) : null}
          {actions}
        </div>
      </div>
      <AdminDashboard
        initialCounts={counts}
        initialSection={section}
        hideLauncher
      />
    </div>
  )
}
