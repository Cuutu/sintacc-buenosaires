"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { getCategoryLabel } from "@/lib/venture-constants"
import type { VentureItem } from "@/components/admin/types"
import { toast } from "sonner"

export type AdminVenturesSectionProps = {
  ventures: VentureItem[]
  loading: boolean
  search: string
  setSearch: (v: string) => void
  fetchVentures: () => void
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
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-card">
        <h2 className="text-sm font-bold">Emprendimientos publicados</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Listado de marcas y proyectos en /emprendimientos
        </p>
      </div>

      <div className="px-4 py-2 border-b border-border">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No hay emprendimientos publicados
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map((v) => (
            <div
              key={v._id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <p className="font-semibold">{v.name}</p>
                <p className="text-xs text-muted-foreground">
                  {getCategoryLabel(v.category)} · {v.zone}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a
                    href={`/emprendimientos/${(v as { slug?: string }).slug ?? v._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(v._id, v.name)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
