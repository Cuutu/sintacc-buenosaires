"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, MoreHorizontal, Search } from "lucide-react"
import { TYPES } from "@/lib/constants"
import { inferSafetyLevel, getSafetyBadge } from "@/components/featured/featured-utils"
import { PlaceEditModal } from "@/components/admin/PlaceEditModal"
import { AdminPlaceReviewTools } from "@/components/admin/AdminPlaceReviewTools"
import type { PlaceItem } from "@/components/admin/types"
import { getPlacePath } from "@/lib/place-url"
import { placeCompleteness } from "@/lib/place-completeness"
import { PlaceCompleteness } from "@/components/admin/PlaceCompleteness"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"

export type AdminPlacesSectionProps = {
  places: PlaceItem[]
  placesLoading: boolean
  placeSearch: string
  setPlaceSearch: (v: string) => void
  placeFilter: string
  setPlaceFilter: (v: string) => void
  placeNeighborhoodFilter: string
  setPlaceNeighborhoodFilter: (v: string) => void
  placeTypeFilter: string
  setPlaceTypeFilter: (v: string) => void
  placeMissingInfoFilter: boolean
  setPlaceMissingInfoFilter: (v: boolean) => void
  placeMissingBadgeFilter: boolean
  setPlaceMissingBadgeFilter: (v: boolean) => void
  placeNoPhotoFilter: boolean
  setPlaceNoPhotoFilter: (v: boolean) => void
  placeNoHoursFilter: boolean
  setPlaceNoHoursFilter: (v: boolean) => void
  placeNoCoordsFilter: boolean
  setPlaceNoCoordsFilter: (v: boolean) => void
  placeNoPhoneFilter: boolean
  setPlaceNoPhoneFilter: (v: boolean) => void
  placeNoWebFilter: boolean
  setPlaceNoWebFilter: (v: boolean) => void
  placeNoDescriptionFilter: boolean
  setPlaceNoDescriptionFilter: (v: boolean) => void
  placeNoTaccFilter: boolean
  setPlaceNoTaccFilter: (v: boolean) => void
  placeIncompleteFichaFilter: boolean
  setPlaceIncompleteFichaFilter: (v: boolean) => void
  placeFeaturedFilter: boolean
  setPlaceFeaturedFilter: (v: boolean) => void
  placeProvinceFilter: string
  setPlaceProvinceFilter: (v: string) => void
  placeLocalityFilter: string
  setPlaceLocalityFilter: (v: string) => void
  placeSort: string
  setPlaceSort: (v: string) => void
  placePopularFilter: boolean
  setPlacePopularFilter: (v: boolean) => void
  provinces: string[]
  localities: string[]
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
    action: "approve" | "unpublish" | "delete" | "set_safety_level" | "clear_safety_level",
    safetyLevel?: "dedicated_gf" | "gf_options"
  ) => void
  handleDeletePlace: (id: string, name: string) => void
  handleDuplicatePlace: (place: PlaceItem) => void
  editingPlaceId: string | null
  setEditingPlaceId: (id: string | null) => void
  placeIncompleteOnlyFilter: boolean
  setPlaceIncompleteOnlyFilter: (v: boolean) => void
  placeReviewMode: "duplicates" | "incomplete" | "google" | null
  setPlaceReviewMode: (mode: "duplicates" | "incomplete" | "google" | null) => void
}

function formatEdit(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
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
    placeTypeFilter,
    setPlaceTypeFilter,
    placeMissingInfoFilter,
    setPlaceMissingInfoFilter,
    placeMissingBadgeFilter,
    setPlaceMissingBadgeFilter,
    placeNoPhotoFilter,
    setPlaceNoPhotoFilter,
    placeNoHoursFilter,
    setPlaceNoHoursFilter,
    placeNoCoordsFilter,
    setPlaceNoCoordsFilter,
    placeNoPhoneFilter,
    setPlaceNoPhoneFilter,
    placeNoWebFilter,
    setPlaceNoWebFilter,
    placeNoDescriptionFilter,
    setPlaceNoDescriptionFilter,
    placeNoTaccFilter,
    setPlaceNoTaccFilter,
    placeIncompleteFichaFilter,
    setPlaceIncompleteFichaFilter,
    placeFeaturedFilter,
    setPlaceFeaturedFilter,
    placeProvinceFilter,
    setPlaceProvinceFilter,
    placeLocalityFilter,
    setPlaceLocalityFilter,
    placeSort,
    setPlaceSort,
    placePopularFilter,
    setPlacePopularFilter,
    provinces,
    localities,
    placesPagination,
    neighborhoods,
    selectedPlaceIds,
    togglePlaceSelection,
    toggleAllPlaces,
    fetchPlaces,
    goToPlacesPage,
    handleBulkAction,
    handleDeletePlace,
    handleDuplicatePlace,
    editingPlaceId,
    setEditingPlaceId,
    placeIncompleteOnlyFilter,
    setPlaceIncompleteOnlyFilter,
    placeReviewMode,
    setPlaceReviewMode,
    setPlacesPage,
  } = props

  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const apply = (status?: string) => {
    setPlacesPage(1)
    fetchPlaces(status ?? placeFilter, 1)
  }

  const chip = (active: boolean, label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} className={active ? adminUi.chipActive : adminUi.chip}>
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      <div className={cn(adminUi.card, "p-5")}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B746C]" />
            <input
              placeholder="Buscar por nombre, dirección, barrio o ciudad."
              value={placeSearch}
              onChange={(e) => setPlaceSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") apply()
              }}
              className="h-11 w-full rounded-2xl border border-[#E8E1D6] bg-[#F8F5EF] pl-9 pr-3 text-sm text-[#234A33] outline-none"
            />
          </div>
          <button type="button" className={adminUi.btnGhost} onClick={() => apply()}>
            Buscar
          </button>
          <button
            type="button"
            className={adminUi.btnGhost}
            onClick={() => {
              const rows = [
                ["nombre", "estado", "ciudad", "completitud"],
                ...places.map((p) => [
                  p.name,
                  p.status,
                  p.neighborhood,
                  String(placeCompleteness(p)),
                ]),
              ]
              const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = "celimap-lugares.csv"
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Exportar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {chip(placeFilter === "pending", "Pendientes", () => {
            setPlaceFilter(placeFilter === "pending" ? "" : "pending")
            apply(placeFilter === "pending" ? "" : "pending")
          })}
          {chip(placeFilter === "approved", "Publicados", () => {
            setPlaceFilter(placeFilter === "approved" ? "" : "approved")
            apply(placeFilter === "approved" ? "" : "approved")
          })}
          {chip(placeFeaturedFilter, "Destacados", () => {
            setPlaceFeaturedFilter(!placeFeaturedFilter)
            setTimeout(() => apply(), 0)
          })}
          {chip(placeNoPhotoFilter, "Sin foto", () => {
            setPlaceNoPhotoFilter(!placeNoPhotoFilter)
            setTimeout(() => apply(), 0)
          })}
          {chip(placeNoHoursFilter, "Sin horarios", () => {
            setPlaceNoHoursFilter(!placeNoHoursFilter)
            setTimeout(() => apply(), 0)
          })}
          {chip(placeMissingInfoFilter, "Sin Instagram", () => {
            setPlaceMissingInfoFilter(!placeMissingInfoFilter)
            setTimeout(() => apply(), 0)
          })}
          {chip(placeNoPhoneFilter, "Sin teléfono", () => {
            setPlaceNoPhoneFilter(!placeNoPhoneFilter)
            setTimeout(() => apply(), 0)
          })}
          {chip(placeNoWebFilter, "Sin web", () => {
            setPlaceNoWebFilter(!placeNoWebFilter)
            setTimeout(() => apply(), 0)
          })}
          {chip(placeNoDescriptionFilter, "Sin descripción", () => {
            setPlaceNoDescriptionFilter(!placeNoDescriptionFilter)
            setTimeout(() => apply(), 0)
          })}
          {chip(placeNoCoordsFilter, "Sin coordenadas", () => {
            setPlaceNoCoordsFilter(!placeNoCoordsFilter)
            setTimeout(() => apply(), 0)
          })}
          {chip(placeIncompleteFichaFilter, "Ficha incompleta", () => {
            setPlaceIncompleteFichaFilter(!placeIncompleteFichaFilter)
            setTimeout(() => apply(), 0)
          })}
          {chip(placeNoTaccFilter, "Ficha mínima", () => {
            setPlaceNoTaccFilter(!placeNoTaccFilter)
            setTimeout(() => apply(), 0)
          })}
          {chip(placeReviewMode === "duplicates", "Duplicados", () =>
            setPlaceReviewMode(placeReviewMode === "duplicates" ? null : "duplicates")
          )}
          {placePopularFilter
            ? chip(true, "Con reseñas Google", () => {
                setPlacePopularFilter(false)
                setTimeout(() => apply(), 0)
              })
            : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex h-11 items-center rounded-2xl border border-[#E8E1D6] bg-[#F8F5EF] px-3 text-sm text-[#6B746C]">
            País: Argentina
          </span>
          <select
            value={placeProvinceFilter}
            onChange={(e) => {
              setPlaceProvinceFilter(e.target.value)
              setTimeout(() => apply(), 0)
            }}
            className="h-11 rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 text-sm text-[#234A33]"
          >
            <option value="">Provincia</option>
            {provinces.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={placeLocalityFilter}
            onChange={(e) => {
              setPlaceLocalityFilter(e.target.value)
              setTimeout(() => apply(), 0)
            }}
            className="h-11 rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 text-sm text-[#234A33]"
          >
            <option value="">Ciudad</option>
            {localities.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={placeNeighborhoodFilter}
            onChange={(e) => {
              setPlaceNeighborhoodFilter(e.target.value)
              setTimeout(() => apply(), 0)
            }}
            className="h-11 rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 text-sm text-[#234A33]"
          >
            <option value="">Barrio</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={placeTypeFilter}
            onChange={(e) => {
              setPlaceTypeFilter(e.target.value)
              setTimeout(() => apply(), 0)
            }}
            className="h-11 rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 text-sm text-[#234A33]"
          >
            <option value="">Categoría</option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={placeSort}
            onChange={(e) => {
              setPlaceSort(e.target.value)
              setTimeout(() => apply(), 0)
            }}
            className="h-11 rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] px-3 text-sm text-[#234A33]"
          >
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="name">Nombre</option>
            <option value="completeness">Completitud</option>
            <option value="priority">Prioridad</option>
          </select>
        </div>

        {selectedPlaceIds.size > 0 ? (
          <div className="mt-4 rounded-2xl border border-[#E8E1D6] bg-[#F8F5EF] p-3">
            <p className="mb-2 text-sm font-semibold text-[#234A33]">
              {selectedPlaceIds.size} seleccionados
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={adminUi.chip} onClick={() => handleBulkAction("approve")}>
                Publicar
              </button>
              <button type="button" className={adminUi.chip} onClick={() => handleBulkAction("unpublish")}>
                Despublicar
              </button>
              <button
                type="button"
                className={adminUi.chip}
                onClick={() => {
                  if (selectedPlaceIds.size !== 1) return
                  setEditingPlaceId(Array.from(selectedPlaceIds)[0])
                }}
                disabled={selectedPlaceIds.size !== 1}
                title={selectedPlaceIds.size === 1 ? "Editar ficha" : "Elegí un solo lugar para editar"}
              >
                Editar
              </button>
              <button
                type="button"
                className={adminUi.chip}
                onClick={() => {
                  if (selectedPlaceIds.size !== 1) return
                  setEditingPlaceId(Array.from(selectedPlaceIds)[0])
                }}
                disabled={selectedPlaceIds.size !== 1}
                title={selectedPlaceIds.size === 1 ? "Completar ficha" : "Abrí de a uno para completar"}
              >
                Completar información
              </button>
              <Link href="/admin/destacados" className={adminUi.chip} title="Los destacados se gestionan en su módulo">
                Destacados
              </Link>
              <button type="button" className={adminUi.chip} onClick={() => handleBulkAction("set_safety_level", "dedicated_gf")}>
                100% sin TACC
              </button>
              <button type="button" className={adminUi.chip} onClick={() => handleBulkAction("set_safety_level", "gf_options")}>
                Con opciones
              </button>
              <button
                type="button"
                className="inline-flex h-9 items-center rounded-full border border-[#C85A2E]/30 px-3 text-sm text-[#C85A2E]"
                onClick={() => handleBulkAction("delete")}
              >
                Eliminar
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <AdminPlaceReviewTools
        mode={placeReviewMode}
        onClose={() => setPlaceReviewMode(null)}
        onRefreshPlaces={() => fetchPlaces(undefined, props.placesPage)}
        onEditPlace={setEditingPlaceId}
      />

      <div className={adminUi.card}>
        {placesLoading ? (
          <p className="px-5 py-10 text-center text-sm text-[#6B746C]">Cargando lugares...</p>
        ) : places.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[#6B746C]">No hay lugares</p>
        ) : (
          <>
            <div className="hidden items-center gap-3 border-b border-[#E8E1D6] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6B746C] md:grid md:grid-cols-[auto_minmax(0,1.6fr)_7rem_8rem_9rem_7rem_auto]">
              <input
                type="checkbox"
                checked={selectedPlaceIds.size === places.length && places.length > 0}
                onChange={toggleAllPlaces}
                aria-label="Seleccionar todos"
              />
              <span>Lugar</span>
              <span>Estado</span>
              <span>Ciudad</span>
              <span>Completitud</span>
              <span>Última edición</span>
              <span>Acciones</span>
            </div>

            <div className="divide-y divide-[#E8E1D6]">
              {places.map((place) => {
                const level = inferSafetyLevel(place)
                const cfg = getSafetyBadge(level)
                const initials = place.name.slice(0, 2).toUpperCase()
                return (
                  <div key={place._id} className="px-5 py-4">
                    <div className="grid items-center gap-3 md:grid-cols-[auto_minmax(0,1.6fr)_7rem_8rem_9rem_7rem_auto]">
                      <input
                        type="checkbox"
                        checked={selectedPlaceIds.has(place._id)}
                        onChange={() => togglePlaceSelection(place._id)}
                        aria-label={`Seleccionar ${place.name}`}
                      />
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-[#E8E1D6]">
                          {place.photos?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={place.photos[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-display text-sm font-bold text-[#234A33]">
                              {initials}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#234A33]">{place.name}</p>
                          <p className="truncate text-xs text-[#6B746C]">
                            {TYPES.find((t) => t.value === place.type)?.label || place.type}
                            {level && level !== "unknown" ? ` · ${cfg.label}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-[#234A33]">
                        {place.status === "approved" ? "Publicado" : "Pendiente"}
                      </span>
                      <span className="truncate text-sm text-[#6B746C]">
                        {place.locality || place.neighborhood || "—"}
                      </span>
                      <PlaceCompleteness place={place} />
                      <span className="text-sm text-[#6B746C]">{formatEdit(place.updatedAt)}</span>
                      <div className="relative flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={adminUi.chip}
                          onClick={() => setEditingPlaceId(place._id)}
                        >
                          Editar
                        </button>
                        <Link href={getPlacePath(place)} target="_blank" className={adminUi.chip}>
                          Ver
                        </Link>
                        <button
                          type="button"
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E8E1D6] text-[#234A33]"
                          onClick={() => setOpenMenu(openMenu === place._id ? null : place._id)}
                          aria-label="Más acciones"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {openMenu === place._id ? (
                          <div className="absolute right-0 top-11 z-10 min-w-[10rem] rounded-2xl border border-[#E8E1D6] bg-[#FCFBF8] p-1 shadow-[0_8px_28px_-18px_rgba(35,74,51,0.28)]">
                            <button
                              type="button"
                              className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-[#234A33]"
                              onClick={() => {
                                setOpenMenu(null)
                                handleDuplicatePlace(place)
                              }}
                            >
                              Duplicar
                            </button>
                            <button
                              type="button"
                              className="flex h-10 w-full items-center rounded-xl px-3 text-sm text-[#C85A2E]"
                              onClick={() => {
                                setOpenMenu(null)
                                handleDeletePlace(place._id, place.name)
                              }}
                            >
                              Eliminar
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {placesPagination && placesPagination.pages > 1 ? (
              <div className="flex items-center justify-center gap-2 border-t border-[#E8E1D6] py-4">
                <button
                  type="button"
                  className={adminUi.btnGhost}
                  disabled={placesPagination.page <= 1}
                  onClick={() => goToPlacesPage(placesPagination.page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </button>
                <span className="px-2 text-xs text-[#6B746C]">
                  Página {placesPagination.page} de {placesPagination.pages}
                </span>
                <button
                  type="button"
                  className={adminUi.btnGhost}
                  disabled={placesPagination.page >= placesPagination.pages}
                  onClick={() => goToPlacesPage(placesPagination.page + 1)}
                >
                  Siguiente
                  <ChevronRight className="ml-1 h-4 w-4" />
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>

      {editingPlaceId ? (
        <PlaceEditModal
          placeId={editingPlaceId}
          open={!!editingPlaceId}
          onOpenChange={(open) => !open && setEditingPlaceId(null)}
          onSaved={() => {
            fetchPlaces(placeFilter || undefined, props.placesPage)
            setEditingPlaceId(null)
          }}
        />
      ) : null}
    </div>
  )
}
