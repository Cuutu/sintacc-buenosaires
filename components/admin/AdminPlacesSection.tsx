"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { TYPES } from "@/lib/constants"
import { inferSafetyLevel, getSafetyBadge } from "@/components/featured/featured-utils"
import { PlaceEditModal } from "@/components/admin/PlaceEditModal"
import type { PlaceItem } from "@/components/admin/types"

export type AdminPlacesSectionProps = {
  places: PlaceItem[]
  placesLoading: boolean
  placeSearch: string
  setPlaceSearch: (v: string) => void
  placeFilter: string
  setPlaceFilter: (v: string) => void
  placeNeighborhoodFilter: string
  setPlaceNeighborhoodFilter: (v: string) => void
  placeMissingInfoFilter: boolean
  setPlaceMissingInfoFilter: (v: boolean) => void
  placeMissingBadgeFilter: boolean
  setPlaceMissingBadgeFilter: (v: boolean) => void
  placesPage: number
  setPlacesPage: (p: number) => void
  placesPagination: { total: number; page: number; pages: number } | null
  neighborhoods: string[]
  selectedPlaceIds: Set<string>
  togglePlaceSelection: (id: string) => void
  toggleAllPlaces: () => void
  fetchPlaces: (status?: string, page?: number) => void
  goToPlacesPage: (p: number) => void
  handleBulkAction: (
    action: "approve" | "delete" | "set_safety_level" | "clear_safety_level",
    safetyLevel?: "dedicated_gf" | "gf_options"
  ) => void
  handleDeletePlace: (id: string, name: string) => void
  editingPlaceId: string | null
  setEditingPlaceId: (id: string | null) => void
}

export function AdminPlacesSection(props: AdminPlacesSectionProps) {
const {
  places,
  placesLoading,
  placeSearch,
  setPlaceSearch,
  placeFilter,
  setPlaceFilter,
  placeNeighborhoodFilter,
  setPlaceNeighborhoodFilter,
  placeMissingInfoFilter,
  setPlaceMissingInfoFilter,
  placeMissingBadgeFilter,
  setPlaceMissingBadgeFilter,
  placesPage,
  setPlacesPage,
  placesPagination,
  neighborhoods,
  selectedPlaceIds,
  togglePlaceSelection,
  toggleAllPlaces,
  fetchPlaces,
  goToPlacesPage,
  handleBulkAction,
  handleDeletePlace,
  editingPlaceId,
  setEditingPlaceId,
} = props
  return (
  <div className="rounded-xl border border-border overflow-hidden">
    <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
      <div>
        <h2 className="text-sm font-bold flex items-center gap-2">
          📍 Lugares publicados
          {placesPagination && (
            <span className="text-xs text-muted-foreground font-normal">
              {placesPagination.total} en total
            </span>
          )}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Editá los datos, cambiá el nivel de seguridad o eliminá lugares incorrectos
        </p>
      </div>
    </div>

    {/* Filtros */}
    <div className="px-4 py-3 border-b border-border bg-card/50 space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, barrio..."
            value={placeSearch}
            onChange={(e) => setPlaceSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setPlacesPage(1); fetchPlaces(undefined, 1) }
            }}
            className="pl-8 h-8 text-sm"
          />
        </div>
        <Button size="sm" variant="secondary" className="h-8"
          onClick={() => { setPlacesPage(1); fetchPlaces(undefined, 1) }}>
          Buscar
        </Button>
      </div>
      {/* Fila 1: Estado de publicación */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider shrink-0">
          Estado:
        </span>
        {[
          { label: "Todos", value: "" },
          { label: "✅ Publicados", value: "approved" },
          { label: "⏳ Pendientes", value: "pending" },
        ].map((f) => (
          <button key={f.value}
            onClick={() => { setPlaceFilter(f.value); setPlacesPage(1); fetchPlaces(f.value, 1) }}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              placeFilter === f.value
                ? "border-primary/40 bg-primary/8 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-border/80"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Fila 2: Clasificación de seguridad — el flujo más importante */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider shrink-0">
          Clasificación sin TACC:
        </span>
        <button
          onClick={() => {
            setPlaceMissingBadgeFilter(!placeMissingBadgeFilter)
            setPlacesPage(1)
            setTimeout(() => fetchPlaces(undefined, 1), 0)
          }}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
            placeMissingBadgeFilter
              ? "border-amber-500/50 bg-amber-500/12 text-amber-400"
              : "border-border bg-card text-muted-foreground hover:border-amber-500/30"
          }`}>
          ⚠️ Sin clasificar {placeMissingBadgeFilter && "(activo)"}
        </button>
        <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">
          ← seleccioná estos para clasificarlos en masa con los botones de abajo
        </span>
      </div>

      {/* Fila 3: Barrio y otros filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider shrink-0">
          Barrio:
        </span>
        <select
          value={placeNeighborhoodFilter}
          onChange={(e) => {
            setPlaceNeighborhoodFilter(e.target.value)
            setPlacesPage(1)
            setTimeout(() => fetchPlaces(undefined, 1), 0)
          }}
          className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none"
        >
          <option value="">Todos los barrios</option>
          {neighborhoods.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button
          onClick={() => {
            setPlaceMissingInfoFilter(!placeMissingInfoFilter)
            setPlacesPage(1)
            setTimeout(() => fetchPlaces(undefined, 1), 0)
          }}
          className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
            placeMissingInfoFilter
              ? "border-blue-500/40 bg-blue-500/8 text-blue-400"
              : "border-border bg-card text-muted-foreground"
          }`}>
          📭 Sin información de contacto
        </button>
      </div>

      {/* Bulk actions — solo cuando hay seleccionados */}
      {selectedPlaceIds.size > 0 && (
        <div className="rounded-xl border border-primary/25 bg-primary/4 p-3 space-y-2">
          <p className="text-xs font-bold flex items-center gap-2">
            <span className="bg-primary text-primary-foreground text-[10px] font-mono px-2 py-0.5 rounded-full">
              {selectedPlaceIds.size}
            </span>
            lugar{selectedPlaceIds.size > 1 ? "es" : ""} seleccionado{selectedPlaceIds.size > 1 ? "s" : ""}
            — elegí qué hacer:
          </p>
          {/* Clasificación — acción principal */}
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] text-muted-foreground/60 self-center shrink-0">
              Clasificar como:
            </span>
            <Button size="sm" variant="outline"
              className="h-8 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/8"
              onClick={() => handleBulkAction("set_safety_level", "dedicated_gf")}>
              🟢 100% sin TACC
            </Button>
            <Button size="sm" variant="outline"
              className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/8"
              onClick={() => handleBulkAction("set_safety_level", "gf_options")}>
              🟡 Con opciones sin TACC
            </Button>
            <Button size="sm" variant="ghost"
              className="h-8 text-xs gap-1.5 text-muted-foreground/60 hover:text-muted-foreground"
              onClick={() => handleBulkAction("clear_safety_level")}>
              ⚪ Quitar clasificación
            </Button>
          </div>
          {/* Otras acciones — separadas visualmente */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
            <Button size="sm" className="h-8 text-xs"
              onClick={() => handleBulkAction("approve")}>
              ✅ Publicar seleccionados
            </Button>
            <Button size="sm" variant="destructive"
              className="h-8 text-xs ml-auto"
              onClick={() => handleBulkAction("delete")}>
              🗑 Eliminar seleccionados
            </Button>
          </div>
        </div>
      )}
    </div>

    {placesLoading ? (
      <div className="text-center py-10 text-muted-foreground text-sm">Cargando lugares...</div>
    ) : places.length === 0 ? (
      <div className="text-center py-10 text-muted-foreground text-sm">No hay lugares</div>
    ) : (
      <>
        {/* Checkbox "seleccionar todos" */}
        <div className="px-4 py-2 border-b border-border bg-card/30 flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedPlaceIds.size === places.length && places.length > 0}
            onChange={toggleAllPlaces}
            className="rounded"
          />
          <span className="text-xs text-muted-foreground">Seleccionar todos en esta página</span>
        </div>

        <div className="divide-y divide-border">
          {places.map((place) => {
            const level = inferSafetyLevel(place)
            const cfg = getSafetyBadge(level)
            const hasBadge = level && level !== "unknown"
            const safetyLabel = hasBadge ? cfg.label : "Sin clasificar"
            const safetyDot = hasBadge ? cfg.dot : "⚠️"

            return (
              <div key={place._id} className="px-4 py-3 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedPlaceIds.has(place._id)}
                  onChange={() => togglePlaceSelection(place._id)}
                  className="rounded flex-shrink-0"
                />
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-base flex-shrink-0 overflow-hidden">
                  {place.photos?.[0]
                    ? <img src={place.photos[0]} alt={place.name} className="w-full h-full object-cover rounded-lg" />
                    : TYPES.find((t) => t.value === place.type)?.emoji ?? "📍"
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{place.name}</p>
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <span className="text-xs text-muted-foreground">{place.neighborhood}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      hasBadge ? cfg.className : "border-amber-500/30 bg-amber-500/8 text-amber-400"
                    }`}>
                      {safetyDot} {safetyLabel}
                    </span>
                    {place.stats && place.stats.totalReviews > 0 && (
                      <span className="text-[10px] text-amber-400">
                        ★ {place.stats.avgRating} · {place.stats.totalReviews} reseñas
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                      place.status === "approved"
                        ? "border-primary/20 bg-primary/8 text-primary"
                        : "border-amber-500/20 bg-amber-500/8 text-amber-400"
                    }`}>
                      {place.status === "approved" ? "✓ publicado" : "⏳ pendiente"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                    onClick={() => setEditingPlaceId(place._id)}>
                    ✏️ Editar
                  </Button>
                  <Link href={`/lugar/${place._id}`} target="_blank">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                      👁 Ver
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/8"
                    onClick={() => handleDeletePlace(place._id, place.name)}
                    title={`Eliminar ${place.name}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Paginación */}
        {placesPagination && placesPagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4 border-t border-border">
            <Button size="sm" variant="outline" className="h-8"
              disabled={placesPagination.page <= 1}
              onClick={() => goToPlacesPage(placesPagination.page - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Página {placesPagination.page} de {placesPagination.pages}
            </span>
            <Button size="sm" variant="outline" className="h-8"
              disabled={placesPagination.page >= placesPagination.pages}
              onClick={() => goToPlacesPage(placesPagination.page + 1)}>
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </>
    )}

    {editingPlaceId && (
      <PlaceEditModal
        placeId={editingPlaceId}
        open={!!editingPlaceId}
        onOpenChange={(open) => !open && setEditingPlaceId(null)}
        onSaved={() => {
          fetchPlaces(placeFilter || undefined, placesPage)
          setEditingPlaceId(null)
        }}
      />
    )}
  </div>

  )
}
