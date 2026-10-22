"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ADMIN_ESTADOS, type AdminEstado } from "@/lib/admin-estado"
import { AdminButton } from "@/components/admin/ui/button"
import { SegmentedControl } from "@/components/admin/ui/segmented-control"
import { StatusBadge, type StatusTone } from "@/components/admin/ui/status-badge"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"

/** Gestión de reseñas y mensajes: pendiente → respondido / archivado. */
export const ESTADO_FILTER_OPTIONS: Array<{ value: "" | AdminEstado; label: string }> = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendientes" },
  { value: "respondido", label: "Respondidos" },
  { value: "archivado", label: "Archivados" },
]

const ESTADO_LABEL: Record<AdminEstado, string> = {
  pendiente: "Pendiente",
  respondido: "Respondido",
  archivado: "Archivado",
}

const ESTADO_TONE: Record<AdminEstado, StatusTone> = {
  pendiente: "warning",
  respondido: "success",
  archivado: "neutral",
}

/** Texto del botón que lleva a ese estado. */
export function estadoActionLabel(next: AdminEstado): string {
  return next === "pendiente" ? "Reabrir" : next === "respondido" ? "Marcar como respondido" : "Archivar"
}

/** Los estados a los que se puede pasar desde el actual (los docs sin estado cuentan como pendientes). */
export function nextEstados(estado: AdminEstado = "pendiente"): AdminEstado[] {
  return ADMIN_ESTADOS.filter((next) => next !== estado)
}

/** PATCH del estado de gestión. Avisa al menú para que actualice los contadores. */
export async function updateAdminEstado(endpoint: string, next: AdminEstado): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: next }),
    })
    if (!res.ok) throw new Error("No se pudo actualizar el estado")
    window.dispatchEvent(new Event("admin:counts-changed"))
    toast.success("Estado actualizado")
    return true
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Error al actualizar")
    return false
  }
}

export function AdminEstadoBadge({ estado = "pendiente" }: { estado?: AdminEstado }) {
  return <StatusBadge tone={ESTADO_TONE[estado]}>{ESTADO_LABEL[estado]}</StatusBadge>
}

/**
 * Filtro de gestión: selector segmentado en pantallas medianas para arriba y un
 * desplegable en el celular (los cuatro segmentos no entran en 390 px).
 */
export function AdminEstadoFilter({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <>
      <SegmentedControl
        ariaLabel="Estado de gestión"
        value={(value || "") as "" | AdminEstado}
        onChange={(next) => onChange(next)}
        options={ESTADO_FILTER_OPTIONS}
        className={cn("hidden sm:inline-flex", className)}
      />
      <select
        aria-label="Estado de gestión"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={cn(adminUi.select, "sm:hidden")}
      >
        {ESTADO_FILTER_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </>
  )
}

/** Botones para cambiar el estado (se usa en el detalle de un mensaje). */
export function AdminEstadoActions({
  endpoint,
  estado = "pendiente",
  onSaved,
}: {
  endpoint: string
  estado?: AdminEstado
  onSaved: () => void
}) {
  const [busy, setBusy] = useState(false)
  async function update(next: AdminEstado) {
    setBusy(true)
    const ok = await updateAdminEstado(endpoint, next)
    setBusy(false)
    if (ok) onSaved()
  }
  return (
    <>
      {nextEstados(estado).map((next) => (
        <AdminButton key={next} disabled={busy} onClick={() => update(next)}>
          {estadoActionLabel(next)}
        </AdminButton>
      ))}
    </>
  )
}
