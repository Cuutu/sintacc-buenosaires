"use client"

import { Search } from "lucide-react"
import { getCategoryLabel } from "@/lib/venture-constants"
import type { VentureItem } from "@/components/admin/types"
import { toast } from "sonner"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"

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
      getCategoryLabel(v.category).toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className={cn(adminUi.card, "p-5")}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B746C]" />
          <input
            placeholder="Buscar marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-2xl border border-[#E8E1D6] bg-[#F8F5EF] pl-9 pr-3 text-sm text-[#234A33] outline-none"
          />
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-[#6B746C]">Cargando...</p>
      ) : filtered.length === 0 ? (
        <p className={cn(adminUi.card, "px-5 py-10 text-center text-sm text-[#6B746C]")}>
          No hay emprendimientos publicados
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.map((v) => (
            <article key={v._id} className={cn(adminUi.card, "p-5")}>
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#E8E1D6]">
                  {v.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.photos[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-display text-sm font-bold text-[#234A33]">
                      {v.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[#234A33]">{v.name}</p>
                  <p className="mt-1 text-sm text-[#6B746C]">
                    {getCategoryLabel(v.category)} · {v.zone || "Sin zona"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {hasModality(v, "delivery") ? <span className={adminUi.chip}>Delivery</span> : null}
                    {hasModality(v, "retiro") ? <span className={adminUi.chip}>Retiro</span> : null}
                    {hasModality(v, "envio") || hasModality(v, "envío") ? (
                      <span className={adminUi.chip}>Envíos</span>
                    ) : null}
                    {v.contact?.instagram ? <span className={adminUi.chip}>Instagram</span> : null}
                    {v.contact?.whatsapp ? <span className={adminUi.chip}>WhatsApp</span> : null}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/emprendimientos/${(v as { slug?: string }).slug ?? v._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={adminUi.chip}
                >
                  Ver
                </a>
                <button
                  type="button"
                  className="inline-flex h-9 items-center rounded-full border border-[#C85A2E]/30 px-3 text-sm text-[#C85A2E]"
                  onClick={() => handleDelete(v._id, v.name)}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
