"use client"

import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ContaminationRiskBadgeProps {
  count: number
  variant?: "inline" | "banner" | "card"
  className?: string
}

/** Badge visible para indicar que el lugar tiene reportes de contaminación */
export function ContaminationRiskBadge({
  count,
  variant = "inline",
  className,
}: ContaminationRiskBadgeProps) {
  const label = count === 1
    ? "1 reporte de contaminación"
    : `${count} reportes de contaminación`

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-amber-500/60 bg-amber-500/15",
          "text-amber-700 dark:text-amber-400",
          className
        )}
        role="alert"
      >
        <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Riesgo de contaminación</p>
          <p className="text-sm opacity-90">{label}</p>
        </div>
      </div>
    )
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg",
          "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40",
          "font-medium text-sm",
          className
        )}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <span>Riesgo de contaminación</span>
        {count > 1 && (
          <span className="opacity-80">({count})</span>
        )}
      </div>
    )
  }

  // inline - pequeño como los otros badges
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium",
        "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/40",
        className
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Riesgo de contaminación
    </span>
  )
}
