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
          ? "border-danger bg-danger-soft"
          : "border-warning-bar bg-warning-soft"
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle
          className={`mt-0.5 h-4 w-4 shrink-0 ${hasExact ? "text-danger" : "text-warning"}`}
        />
        <div className="min-w-0 space-y-1.5">
          <p className={`font-semibold ${hasExact ? "text-danger" : "text-warning"}`}>
            {hasExact
              ? "Ya existe en el mapa (nombre, dirección y tipo)"
              : "Posible duplicado"}
          </p>
          {warnings.map((warning) => (
            <div key={`${warning.kind}-${warning.id}`} className="text-[11px] leading-relaxed">
              <span className="font-medium text-olive/90">{warning.name}</span>
              <span className="text-ink-muted">
                {" "}
                ({warning.kind === "place" ? "publicado" : "otra sugerencia"})
              </span>
              {warning.address ? (
                <span className="text-ink-muted"> · {warning.address}</span>
              ) : null}
              {warning.type ? (
                <span className="text-ink-muted"> · {typeLabel(warning.type)}</span>
              ) : null}
              <div className="text-ink-muted">
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
