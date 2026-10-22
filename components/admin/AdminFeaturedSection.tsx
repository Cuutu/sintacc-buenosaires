"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ArrowDown, ArrowUp, Loader2, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { TYPES } from "@/lib/constants"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"
import { type PlaceWithStats } from "@/components/featured/featured-utils"
import { featuredTrust, featuredTrustNote } from "@/lib/home/featured-trust"
import { AdminListSkeleton } from "@/components/admin/ui/states"
import { AdminButton } from "@/components/admin/ui/button"
import { StatusBadge } from "@/components/admin/ui/status-badge"
import { formatCount } from "@/lib/admin-format"

export type FeaturedPlaceItem = {
  _id: string
  name: string
  neighborhood: string
  type: string
  photos?: string[]
  slug?: string
  featuredOrder?: number
  safetyLevel?: PlaceWithStats["safetyLevel"]
  tags?: string[]
  stats?: PlaceWithStats["stats"]
  googleSnapshot?: PlaceWithStats["googleSnapshot"]
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

/** "5 de 6": cuántos lugares del carrusel están ocupados. */
export function featuredSlotsLabel(count: number, max: number): string {
  return `${formatCount(count)} de ${formatCount(max)}`
}

/** Posiciones libres (1-based) que se muestran como "Lugar libre" hasta llegar al máximo. */
export function emptyFeaturedPositions(count: number, max: number): number[] {
  return Array.from({ length: Math.max(0, max - count) }, (_, i) => count + i + 1)
}

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
  const searchRef = useRef<HTMLInputElement>(null)

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
          <div className="min-w-0 space-y-2">
            <StatusBadge tone={places.length >= max ? "success" : "neutral"}>
              {featuredSlotsLabel(places.length, max)} lugares
            </StatusBadge>
            <p className="text-sm text-ink-muted">
              El orden es el del carrusel de la home. En la home solo se muestran los 100% sin TACC; si
              faltan, se completa con otros 100% con foto.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <AdminButton onClick={fetchFeatured} disabled={loading || saving}>
              Recargar
            </AdminButton>
            <AdminButton variant="primary" onClick={handleSave} disabled={!dirty || saving || loading}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              Guardar
            </AdminButton>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lugar aprobado para destacar..."
            className={cn(adminUi.input, "pl-9")}
            aria-label="Buscar lugar para destacar"
          />
          {(searching || hits.length > 0) && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-2xl border border-line bg-cream-card">
              {searching ? <p className="px-3 py-2 text-xs text-ink-muted">Buscando...</p> : null}
              {!searching &&
                hits.map((hit) => (
                  <button
                    key={hit._id}
                    type="button"
                    onClick={() => addPlace(hit)}
                    className="flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-cream"
                  >
                    <Cover photos={hit.photos} name={hit.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-olive">{hit.name}</span>
                      <span className="block truncate text-xs text-ink-muted">{hit.neighborhood}</span>
                    </span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <AdminListSkeleton rows={3} label="Cargando destacados…" />
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
              <div className="relative aspect-[3/2] bg-line">
                {place.photos?.[0] ? (
                  <Image src={place.photos[0]} alt="" fill className="object-cover" sizes="400px" />
                ) : (
                  <div className="flex h-full items-center justify-center font-display text-2xl font-bold text-olive">
                    {place.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <SlotNumber position={index + 1} />
              </div>
              <div className="p-4">
                <p className="truncate font-semibold text-olive">{place.name}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {place.neighborhood} · {TYPES.find((t) => t.value === place.type)?.label || place.type}
                </p>
                {/* Recién agregado desde el buscador no trae tags ni reseñas: se sabe al guardar. */}
                {place.tags !== undefined && featuredTrustNote(place) ? (
                  <p
                    className={
                      ["not_dedicated", "reports"].includes(featuredTrust(place))
                        ? "mt-2 rounded-xl bg-terracotta/10 px-2.5 py-1.5 text-xs font-semibold text-terracotta-hover"
                        : "mt-2 rounded-xl bg-warning-soft px-2.5 py-1.5 text-xs font-semibold text-warning"
                    }
                  >
                    {featuredTrustNote(place)}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <AdminButton
                    size="icon"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Subir ${place.name}`}
                    title="Subir"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </AdminButton>
                  <AdminButton
                    size="icon"
                    onClick={() => move(index, 1)}
                    disabled={index === places.length - 1}
                    aria-label={`Bajar ${place.name}`}
                    title="Bajar"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </AdminButton>
                  <AdminButton variant="danger" onClick={() => removePlace(place._id)}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Quitar
                  </AdminButton>
                </div>
              </div>
            </article>
          ))}
          {emptyFeaturedPositions(places.length, max).map((position) => (
            <button
              key={`libre-${position}`}
              type="button"
              onClick={() => searchRef.current?.focus()}
              className="group relative flex min-h-[14rem] flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed border-line bg-transparent p-4 text-center transition-colors duration-150 hover:bg-cream-card"
            >
              <SlotNumber position={position} muted />
              <Plus className="h-6 w-6 text-ink-muted" aria-hidden />
              <span className="font-semibold text-olive">Lugar libre</span>
              <span className="text-sm text-ink-muted">Buscá un lugar arriba para sumarlo.</span>
            </button>
          ))}
        </div>
      )}

      {places.length > 0 ? (
        <section>
          <h2 className="mb-3 text-base font-bold text-olive">Vista previa del carrusel</h2>
          <div
            className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2"
            data-overflow-allowed="admin-ops-quick"
          >
            {places.map((place) => (
              <article key={`preview-${place._id}`} className="w-[220px] shrink-0 overflow-hidden rounded-[24px] border border-line bg-cream-card">
                <div className="relative aspect-[3/2] bg-line">
                  {place.photos?.[0] ? (
                    <Image src={place.photos[0]} alt="" fill className="object-cover" sizes="220px" />
                  ) : null}
                </div>
                <p className="truncate px-3 py-2 text-sm font-semibold text-olive">{place.name}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

/** Número de posición en el carrusel (1 = el primero). */
function SlotNumber({ position, muted = false }: { position: number; muted?: boolean }) {
  return (
    <span
      aria-label={`Posición ${position}`}
      className={cn(
        "absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold tabular-nums",
        muted ? "border border-line bg-cream text-ink-muted" : "bg-olive text-cream shadow-sm"
      )}
    >
      {position}
    </span>
  )
}

function Cover({ photos, name }: { photos?: string[]; name: string }) {
  const src = photos?.[0]
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-line">
      {src ? (
        <Image src={src} alt="" fill className="object-cover" sizes="40px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-olive">
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  )
}
