"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ADMIN_ESTADOS, type AdminEstado } from "@/lib/admin-estado"
import { adminUi } from "@/lib/admin-ui"

export function AdminEstadoFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <div className="flex gap-2 overflow-x-auto px-4 py-3" aria-label="Estado de gestión">
    {[{ value: "", label: "Todos" }, { value: "pendiente", label: "Pendientes" }, { value: "respondido", label: "Respondidos" }, { value: "archivado", label: "Archivados" }].map((item) => (
      <button key={item.value} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)} className={`${value === item.value ? adminUi.chipActive : adminUi.chip} min-h-11 shrink-0`}>{item.label}</button>
    ))}
  </div>
}

export function AdminEstadoActions({ endpoint, estado = "pendiente", onSaved }: { endpoint: string; estado?: AdminEstado; onSaved: () => void }) {
  const [busy, setBusy] = useState(false)
  async function update(next: AdminEstado) {
    setBusy(true)
    try {
      const res = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado: next }) })
      if (!res.ok) throw new Error("No se pudo actualizar el estado")
      window.dispatchEvent(new Event("admin:counts-changed"))
      onSaved()
      toast.success("Estado actualizado")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar")
    } finally { setBusy(false) }
  }
  return <div className="my-3 space-y-2">
    <p className="text-xs font-semibold capitalize">Gestión: {estado}</p>
    <div className="flex flex-wrap gap-2">
      {ADMIN_ESTADOS.filter((next) => next !== estado).map((next) => <button key={next} type="button" disabled={busy} className={`${adminUi.btnGhost} min-h-11`} onClick={() => update(next)}>
        {next === "pendiente" ? "Reabrir" : next === "respondido" ? "Marcar como respondido" : "Archivar"}
      </button>)}
    </div>
  </div>
}
