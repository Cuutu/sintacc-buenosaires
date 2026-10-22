"use client"

import Link from "next/link"
import { ChevronLeft, ChevronRight, Copy, Search, Trash2 } from "lucide-react"
import { TYPES } from "@/lib/constants"
import { inferSafetyLevel, getSafetyBadge } from "@/components/featured/featured-utils"
import { PlaceEditModal } from "@/components/admin/PlaceEditModal"
import { AdminPlaceReviewTools } from "@/components/admin/AdminPlaceReviewTools"
import type { PlaceItem } from "@/components/admin/types"
import { getPlacePath } from "@/lib/place-url"
import { placeCompleteness } from "@/lib/place-completeness"
import { formatLocalityName, formatShortPlaceAddress } from "@/lib/place-location-display"
import { PlaceCompleteness } from "@/components/admin/PlaceCompleteness"
import { ActionMenu } from "@/components/admin/ui/action-menu"
import { adminButtonClass } from "@/components/admin/ui/button"
import { PublishStatusBadge } from "@/components/admin/ui/status-badge"
import { AdminEmptyState, AdminListSkeleton } from "@/components/admin/ui/states"
import { adminUi } from "@/lib/admin-ui"
import { cn } from "@/lib/utils"
import { formatAdminDate } from "@/lib/admin-format"

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
  handleBulkResearch: () => void
  handleDeletePlace: (id: string, name: string) => void
  handleDuplicatePlace: (place: PlaceItem) => void
  editingPlaceId: string | null
  setEditingPlaceId: (id: string | null) => void
  placeIncompleteOnlyFilter: boolean
  setPlaceIncompleteOnlyFilter: (v: boolean) => void
  placeReviewMode: "duplicates" | "incomplete" | "google" | null
  setPlaceReviewMode: (mode: "duplicates" | "incomplete" | "google" | null) => void
}


function placeAddressLine(place: PlaceItem) {
  return formatShortPlaceAddress(place) || place.address?.trim() || "Sin dirección"
}

/** Ciudad para la tabla: el nombre ("Tres Arroyos"), nunca el slug guardado ("tres-arroyos"). */
function placeCityLabel(place: PlaceItem) {
  return formatLocalityName(place.locality) || place.neighborhood?.trim() || ""
}

/**
 * Misma grilla para el encabezado y las filas, con la columna de acciones de
 * ancho fijo: con `auto` cada fila la medía distinto que el encabezado y los
 * títulos quedaban corridos ~100 px.
 */
const PLACES_TABLE_GRID = "lg:grid-cols-[auto_minmax(0,1.6fr)_7rem_8rem_9rem_7rem_11rem]"

/** Editar (botón) y Ver (link) con el mismo alto: antes uno medía 44 px y el otro 36. */
const ROW_ACTION = adminButtonClass({ variant: "secondary", className: "px-3" })

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
    handleBulkResearch,
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
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              placeholder="Buscar por nombre, dirección, barrio o ciudad."
              value={placeSearch}
              onChange={(e) => setPlaceSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") apply()
              }}
              className={cn(adminUi.input, "pl-9")}
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
                ["nombre", "direccion", "estado", "ciudad", "completitud"],
                ...places.map((p) => [
                  p.name,
                  placeAddressLine(p),
                  p.status,
                  placeCityLabel(p),
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

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [&>button]:shrink-0 [&>button]:whitespace-nowrap lg:flex-wrap">
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
          {chip(placeReviewMode === "incomplete", "Investigar IA", () => {
            if (placeReviewMode === "incomplete") {
              setPlaceReviewMode(null)
              return
            }
            if (placeFilter !== "pending") {
              setPlaceFilter("pending")
              apply("pending")
            }
            setPlaceReviewMode("incomplete")
          })}
          {placePopularFilter
            ? chip(true, "Con reseñas Google", () => {
                setPlacePopularFilter(false)
                setTimeout(() => apply(), 0)
              })
            : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex h-11 items-center rounded-2xl border border-line bg-cream px-3 text-sm text-ink-muted">
            País: Argentina
          </span>
          <select
            value={placeProvinceFilter}
            onChange={(e) => {
              setPlaceProvinceFilter(e.target.value)
              setTimeout(() => apply(), 0)
            }}
            className={adminUi.select}
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
            className={adminUi.select}
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
            className={adminUi.select}
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
            className={adminUi.select}
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
            className={adminUi.select}
          >
            <option value="recent">Más recientes</option>
            <option value="oldest">Más antiguos</option>
            <option value="name">Nombre</option>
            <option value="completeness">Completitud</option>
            <option value="priority">Prioridad</option>
          </select>
        </div>

        {selectedPlaceIds.size > 0 ? (
          <div className="mt-4 rounded-2xl border border-line bg-cream p-3" role="region" aria-label="Acciones para los lugares seleccionados">
            <p className="mb-2 text-sm font-semibold text-olive">
              {selectedPlaceIds.size} seleccionados
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={adminUi.btnGhost} onClick={() => handleBulkAction("approve")}>
                Publicar
              </button>
              <button type="button" className={adminUi.btnGhost} onClick={() => handleBulkResearch()}>
                Investigar con IA
              </button>
              <button type="button" className={adminUi.btnGhost} onClick={() => handleBulkAction("unpublish")}>
                Despublicar
              </button>
              <button
                type="button"
                className={adminUi.btnGhost}
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
                className={adminUi.btnGhost}
                onClick={() => {
                  if (selectedPlaceIds.size !== 1) return
                  setEditingPlaceId(Array.from(selectedPlaceIds)[0])
                }}
                disabled={selectedPlaceIds.size !== 1}
                title={selectedPlaceIds.size === 1 ? "Completar ficha" : "Abrí de a uno para completar"}
              >
                Completar información
              </button>
              <Link href="/admin/destacados" className={adminUi.btnGhost} title="Los destacados se gestionan en su módulo">
                Destacados
              </Link>
              <button type="button" className={adminUi.btnGhost} onClick={() => handleBulkAction("set_safety_level", "dedicated_gf")}>
                100% sin TACC
              </button>
              <button type="button" className={adminUi.btnGhost} onClick={() => handleBulkAction("set_safety_level", "gf_options")}>
                Con opciones
              </button>
              <button
                type="button"
                className={adminUi.btnDanger}
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
        catalog="pending"
        onClose={() => setPlaceReviewMode(null)}
        onRefreshPlaces={() => fetchPlaces(undefined, props.placesPage)}
        onEditPlace={setEditingPlaceId}
      />

      <div className={adminUi.card}>
        {placesLoading ? (
          <AdminListSkeleton rows={6} label="Cargando lugares…" />
        ) : places.length === 0 ? (
          <AdminEmptyState title="No hay lugares con estos filtros" hint="Probá sacando alguno." />
        ) : (
          <>
            <div className="lg:hidden space-y-3 p-3">
              {places.map(place => {
                const completeness = placeCompleteness(place)
                return <article key={place._id} className="rounded-2xl border border-line bg-cream p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 break-words font-semibold">{place.name}</h3>
                    <PublishStatusBadge status={place.status} />
                  </div>
                  <p className="mt-2 text-sm text-olive">{placeAddressLine(place)}</p>
                  <p className="mt-1 text-xs text-ink-muted">{[placeCityLabel(place), place.province].filter(Boolean).join(" · ") || "Sin ciudad"}</p>
                  <p className="mt-4 text-xs">Completitud: {completeness}%</p>
                  <div role="progressbar" aria-label={`Completitud de ${place.name}`} aria-valuenow={completeness} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-olive" style={{ width: `${completeness}%` }} />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={selectedPlaceIds.has(place._id)} onChange={() => togglePlaceSelection(place._id)} aria-label={`Seleccionar ${place.name}`} />Seleccionar</label>
                    <button type="button" className={cn(adminUi.btnGhost, "flex-1")} onClick={() => setEditingPlaceId(place._id)}>Editar</button>
                  </div>
                </article>
              })}
            </div>
            <div className={`hidden items-center gap-3 border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted lg:grid ${PLACES_TABLE_GRID}`}>
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

            <div className="hidden divide-y divide-line lg:block">
              {places.map((place) => {
                const level = inferSafetyLevel(place)
                const cfg = getSafetyBadge(level)
                const initials = place.name.slice(0, 2).toUpperCase()
                return (
                  <div key={place._id} className="px-5 py-4">
                    <div className={`grid items-center gap-3 ${PLACES_TABLE_GRID}`}>
                      <input
                        type="checkbox"
                        checked={selectedPlaceIds.has(place._id)}
                        onChange={() => togglePlaceSelection(place._id)}
                        aria-label={`Seleccionar ${place.name}`}
                      />
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-line">
                          {place.photos?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={place.photos[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-display text-sm font-bold text-olive">
                              {initials}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-olive">{place.name}</p>
                          <p className="truncate text-xs text-olive">{placeAddressLine(place)}</p>
                          <p className="truncate text-xs text-ink-muted">
                            {TYPES.find((t) => t.value === place.type)?.label || place.type}
                            {level && level !== "unknown" ? ` · ${cfg.label}` : ""}
                          </p>
                        </div>
                      </div>
                      <span>
                        <PublishStatusBadge status={place.status} />
                      </span>
                      <span className="truncate text-sm text-ink-muted" title={placeCityLabel(place) || undefined}>
                        {placeCityLabel(place) || "—"}
                      </span>
                      <PlaceCompleteness place={place} />
                      <span className="text-sm text-ink-muted">{formatAdminDate(place.updatedAt)}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className={ROW_ACTION}
                          onClick={() => setEditingPlaceId(place._id)}
                        >
                          Editar
                        </button>
                        <Link href={getPlacePath(place)} target="_blank" className={ROW_ACTION}>
                          Ver
                        </Link>
                        <ActionMenu
                          label={`Más acciones para ${place.name}`}
                          items={[
                            {
                              label: "Duplicar",
                              icon: <Copy className="h-4 w-4" aria-hidden />,
                              onSelect: () => handleDuplicatePlace(place),
                            },
                            {
                              label: "Eliminar",
                              icon: <Trash2 className="h-4 w-4" aria-hidden />,
                              danger: true,
                              onSelect: () => handleDeletePlace(place._id, place.name),
                            },
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {placesPagination && placesPagination.pages > 1 ? (
              <div className="flex items-center justify-center gap-2 border-t border-line py-4">
                <button
                  type="button"
                  className={adminUi.btnGhost}
                  disabled={placesPagination.page <= 1}
                  onClick={() => goToPlacesPage(placesPagination.page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Anterior
                </button>
                <span className="px-2 text-xs text-ink-muted">
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
