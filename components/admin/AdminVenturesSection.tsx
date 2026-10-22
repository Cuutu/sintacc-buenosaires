"use client"

import { Search, Trash2 } from "lucide-react"
import { useState } from "react"
import { VentureEditModal } from "./VentureEditModal"
import { getCategoryLabels, getVentureCategories } from "@/lib/venture-constants"
import type { VentureItem } from "@/components/admin/types"
import { toast } from "sonner"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"
import { ActionMenu } from "@/components/admin/ui/action-menu"
import { AdminButton, AdminLinkButton } from "@/components/admin/ui/button"
import { Tag } from "@/components/admin/ui/status-badge"
import { AdminEmptyState, AdminListSkeleton } from "@/components/admin/ui/states"

export type AdminVenturesSectionProps = {
  ventures: VentureItem[]
  loading: boolean
  search: string
  setSearch: (v: string) => void
  fetchVentures: () => void
}

function hasModality(v: VentureItem, value: string) {
  return Boolean(v.modalities?.some((m) => m.toLowerCase().includes(value)))
}

export function AdminVenturesSection({
  ventures,
  loading,
  search,
  setSearch,
  fetchVentures,
}: AdminVenturesSectionProps) {
  const [editing, setEditing] = useState<VentureItem | null>(null)
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    try {
      const res = await fetch(`/api/admin/ventures/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Error")
      }
      toast.success("Eliminado")
      fetchVentures()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error")
    }
  }

  const filtered = ventures.filter((v) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      v.name.toLowerCase().includes(q) ||
      v.zone.toLowerCase().includes(q) ||
      getCategoryLabels(getVentureCategories(v)).join(" ").toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className={cn(adminUi.card, "p-5")}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            placeholder="Buscar emprendimiento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(adminUi.input, "pl-9")}
          />
        </div>
      </div>

      {loading ? (
        <div className={adminUi.card}>
          <AdminListSkeleton rows={4} label="Cargando emprendimientos…" />
        </div>
      ) : filtered.length === 0 ? (
        <div className={adminUi.card}>
          <AdminEmptyState title={search.trim() ? "Ningún emprendimiento coincide con la búsqueda" : "No hay emprendimientos publicados"} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((v) => (
            <article key={v._id} className={cn(adminUi.card, "p-5")}>
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-line">
                  {v.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.photos[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-display text-sm font-bold text-olive">
                      {v.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-olive">{v.name}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {getCategoryLabels(getVentureCategories(v)).join(", ")} · {v.zone || "Sin zona"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {hasModality(v, "delivery") ? <Tag>Delivery</Tag> : null}
                    {hasModality(v, "retiro") ? <Tag>Retiro</Tag> : null}
                    {hasModality(v, "envio") || hasModality(v, "envío") ? (
                      <Tag>Envíos</Tag>
                    ) : null}
                    {v.contact?.instagram ? <Tag>Instagram</Tag> : null}
                    {v.contact?.whatsapp ? <Tag>WhatsApp</Tag> : null}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <AdminButton onClick={() => setEditing(v)}>Editar</AdminButton>
                <AdminLinkButton href={`/emprendimientos/${v.slug ?? v._id}`} external>
                  Ver
                </AdminLinkButton>
                <ActionMenu
                  label={`Más acciones para ${v.name}`}
                  items={[
                    {
                      label: "Eliminar",
                      icon: <Trash2 className="h-4 w-4" aria-hidden />,
                      danger: true,
                      onSelect: () => handleDelete(v._id, v.name),
                    },
                  ]}
                />
              </div>
            </article>
          ))}
        </div>
      )}
      {editing ? (
        <VentureEditModal
          key={editing._id}
          venture={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
          onSaved={fetchVentures}
        />
      ) : null}
    </div>
  )
}
