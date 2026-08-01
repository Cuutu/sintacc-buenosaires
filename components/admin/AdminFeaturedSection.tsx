"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Search,
  Star,
  Trash2,
  UtensilsCrossed,
} from "lucide-react"
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
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Star className="h-4 w-4 text-amber-400" aria-hidden />
            Lugares destacados (home)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Elegí hasta {max} lugares. El orden de esta lista es el del carrusel en la home
            (se pueden deslizar todos).
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchFeatured}
            disabled={loading || saving}
          >
            Recargar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!dirty || saving || loading}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar
          </Button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar lugar aprobado para destacar..."
            className="pl-9"
            aria-label="Buscar lugar para destacar"
          />
          {(searching || hits.length > 0) && (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
              {searching && (
                <p className="px-3 py-2 text-xs text-muted-foreground">Buscando...</p>
              )}
              {!searching &&
                hits.map((hit) => (
                  <button
                    key={hit._id}
                    type="button"
                    onClick={() => addPlace(hit)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60"
                  >
                    <Thumb photos={hit.photos} name={hit.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{hit.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {hit.neighborhood}
                      </span>
                    </span>
                  </button>
                ))}
              {!searching && hits.length === 0 && search.trim() && (
                <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Cargando...</p>
        ) : places.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Todavía no hay destacados. Buscá un lugar arriba. Si la lista queda vacía, la home
            usa lugares recientes como respaldo.
          </p>
        ) : (
          <ul className="space-y-2">
            {places.map((place, index) => (
              <li
                key={place._id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-border bg-background/40 px-3 py-2"
                )}
              >
                <span className="w-6 shrink-0 text-center text-xs font-bold text-muted-foreground">
                  {index + 1}
                </span>
                <Thumb photos={place.photos} name={place.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{place.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{place.neighborhood}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Subir"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => move(index, 1)}
                    disabled={index === places.length - 1}
                    aria-label="Bajar"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removePlace(place._id)}
                    aria-label="Quitar de destacados"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Thumb({ photos, name }: { photos?: string[]; name: string }) {
  const src = photos?.[0]
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
      {src ? (
        <Image src={src} alt="" fill className="object-cover" sizes="40px" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <UtensilsCrossed className="h-4 w-4" aria-hidden />
          <span className="sr-only">{name}</span>
        </div>
      )}
    </div>
  )
}
