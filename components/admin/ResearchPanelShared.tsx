"use client"

import { AlertTriangle } from "lucide-react"
import { TYPES } from "@/lib/constants"
import type { DuplicateWarningItem } from "@/components/admin/types"

function typeLabel(type?: string): string {
  if (!type) return "sin tipo"
  return TYPES.find((item) => item.value === type)?.label ?? type
}

export function DuplicateWarningsList({ warnings }: { warnings: DuplicateWarningItem[] }) {
  const hasExact = warnings.some((warning) => warning.matchLevel === "exact")

  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        hasExact
          ? "border-red-500/40 bg-red-500/10"
          : "border-amber-500/30 bg-amber-500/10"
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className={`mt-0.5 h-4 w-4 shrink-0 ${hasExact ? "text-red-400" : "text-amber-400"}`}
        />
        <div className="min-w-0 space-y-1.5">
          <p className={`font-semibold ${hasExact ? "text-red-200" : "text-amber-200"}`}>
            {hasExact
              ? "Ya existe en el mapa (nombre, dirección y tipo)"
              : "Posible duplicado"}
          </p>
          {warnings.map((warning) => (
            <div key={`${warning.kind}-${warning.id}`} className="text-[11px] leading-relaxed">
              <span className="font-medium text-foreground/90">{warning.name}</span>
              <span className="text-muted-foreground">
                {" "}
                ({warning.kind === "place" ? "publicado" : "otra sugerencia"})
              </span>
              {warning.address ? (
                <span className="text-muted-foreground"> · {warning.address}</span>
              ) : null}
              {warning.type ? (
                <span className="text-muted-foreground"> · {typeLabel(warning.type)}</span>
              ) : null}
              <div className="text-muted-foreground">
                {warning.matchLevel === "exact"
                  ? "Coincidencia exacta"
                  : `Coincidencias: ${warning.reasons.join(", ")}`}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
