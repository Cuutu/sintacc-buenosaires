"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { ArrowDown, ArrowUp, Loader2, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { TYPES } from "@/lib/constants"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"

export type FeaturedPlaceItem = {
  _id: string
  name: string
  neighborhood: string
  type: string
  photos?: string[]
  slug?: string
  featuredOrder?: number
}

type SearchHit = {
  _id: string
  name: string
  neighborhood: string
  type: string
  photos?: string[]
  status: string
}

const MAX_HINT = 6

export function AdminFeaturedSection() {
  const [places, setPlaces] = useState<FeaturedPlaceItem[]>([])
  const [max, setMax] = useState(MAX_HINT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [search, setSearch] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const fetchFeatured = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/featured")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al cargar")
      setPlaces(data.places || [])
      setMax(data.max ?? MAX_HINT)
      setDirty(false)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al cargar destacados")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeatured()
  }, [fetchFeatured])

  useEffect(() => {
    if (!search.trim()) {
      setHits([])
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({
          status: "approved",
          search: search.trim(),
          limit: "8",
        })
        const res = await fetch(`/api/admin/places?${params}`)
        const data = await res.json()
        setHits(data.places || [])
      } catch {
        setHits([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const addPlace = (hit: SearchHit) => {
    if (places.some((p) => p._id === hit._id)) {
      toast.message("Ya está en destacados")
      return
    }
    if (places.length >= max) {
      toast.error(`Máximo ${max} lugares destacados`)
      return
    }
    setPlaces((prev) => [
      ...prev,
      {
        _id: hit._id,
        name: hit.name,
        neighborhood: hit.neighborhood,
        type: hit.type,
        photos: hit.photos,
      },
    ])
    setDirty(true)
    setSearch("")
    setHits([])
  }

  const removePlace = (id: string) => {
    setPlaces((prev) => prev.filter((p) => p._id !== id))
    setDirty(true)
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= places.length) return
    setPlaces((prev) => {
      const copy = [...prev]
      const tmp = copy[index]
      copy[index] = copy[next]
      copy[next] = tmp
      return copy
    })
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/featured", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeIds: places.map((p) => p._id) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar")
      setPlaces(data.places || [])
      setDirty(false)
      toast.success("Destacados actualizados")
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className={cn(adminUi.card, "p-5")}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#6B746C]">Hasta {max} lugares. El orden es el del carrusel home.</p>
          <div className="flex gap-2">
            <button type="button" className={adminUi.btnGhost} onClick={fetchFeatured} disabled={loading || saving}>
              Recargar
            </button>
            <button type="button" className={adminUi.btnPrimary} onClick={handleSave} disabled={!dirty || saving || loading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B746C]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lugar aprobado para destacar..."
            className="h-11 w-full rounded-2xl border border-[#E8E1D6] bg-[#F8F5EF] pl-9 pr-3 text-sm text-[#234A33] outline-none"
            aria-label="Buscar lugar para destacar"
          />
          {(searching || hits.length > 0) && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8]">
              {searching ? <p className="px-3 py-2 text-xs text-[#6B746C]">Buscando...</p> : null}
              {!searching &&
                hits.map((hit) => (
                  <button
                    key={hit._id}
                    type="button"
                    onClick={() => addPlace(hit)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[#F8F5EF]"
                  >
                    <Cover photos={hit.photos} name={hit.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-[#234A33]">{hit.name}</span>
                      <span className="block truncate text-xs text-[#6B746C]">{hit.neighborhood}</span>
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-[#6B746C]">Cargando...</p>
      ) : places.length === 0 ? (
        <p className={cn(adminUi.card, "px-5 py-10 text-center text-sm text-[#6B746C]")}>
          Todavía no hay destacados. Buscá un lugar arriba.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {places.map((place, index) => (
            <article
              key={place._id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex == null || dragIndex === index) return
                setPlaces((prev) => {
                  const copy = [...prev]
                  const [item] = copy.splice(dragIndex, 1)
                  copy.splice(index, 0, item)
                  return copy
                })
                setDirty(true)
                setDragIndex(null)
              }}
              className={cn(adminUi.card, "overflow-hidden")}
            >
              <div className="relative aspect-[3/2] bg-[#E8E1D6]">
                {place.photos?.[0] ? (
                  <Image src={place.photos[0]} alt="" fill className="object-cover" sizes="400px" />
                ) : (
                  <div className="flex h-full items-center justify-center font-display text-2xl font-bold text-[#234A33]">
                    {place.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="truncate font-semibold text-[#234A33]">{place.name}</p>
                <p className="mt-1 text-sm text-[#6B746C]">
                  {place.neighborhood} · {TYPES.find((t) => t.value === place.type)?.label || place.type}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={adminUi.chip} onClick={() => move(index, -1)} disabled={index === 0}>
                    <ArrowUp className="mr-1 h-3.5 w-3.5" />
                    Arriba
                  </button>
                  <button
                    type="button"
                    className={adminUi.chip}
                    onClick={() => move(index, 1)}
                    disabled={index === places.length - 1}
                  >
                    <ArrowDown className="mr-1 h-3.5 w-3.5" />
                    Abajo
                  </button>
                  <button type="button" className={adminUi.chip} onClick={() => removePlace(place._id)}>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Quitar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {places.length > 0 ? (
        <section>
          <h2 className={cn("mb-3", adminUi.label)}>Vista previa del carrusel</h2>
          <div
            className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2"
            data-overflow-allowed="admin-ops-quick"
          >
            {places.map((place) => (
              <article key={`preview-${place._id}`} className="w-[220px] shrink-0 overflow-hidden rounded-[24px] border border-[#E8E1D6] bg-[#FCFBF8]">
                <div className="relative aspect-[3/2] bg-[#E8E1D6]">
                  {place.photos?.[0] ? (
                    <Image src={place.photos[0]} alt="" fill className="object-cover" sizes="220px" />
                  ) : null}
                </div>
                <p className="truncate px-3 py-2 text-sm font-semibold text-[#234A33]">{place.name}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function Cover({ photos, name }: { photos?: string[]; name: string }) {
  const src = photos?.[0]
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[#E8E1D6]">
      {src ? (
        <Image src={src} alt="" fill className="object-cover" sizes="40px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#234A33]">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  )
}
