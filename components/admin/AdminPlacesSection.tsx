"use client"

import Link from "next/link"
import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, Search, Sparkles, Trash2, Users, X } from "lucide-react"
import { TYPES } from "@/lib/constants"
import { inferSafetyLevel, getSafetyBadge } from "@/components/featured/featured-utils"
import { PlaceEditModal } from "@/components/admin/PlaceEditModal"
import { AdminPlaceReviewTools } from "@/components/admin/AdminPlaceReviewTools"
import type { AdminCounts, PlaceItem } from "@/components/admin/types"
import { getPlacePath } from "@/lib/place-url"
import { placeCompleteness } from "@/lib/place-completeness"
import { formatLocalityName, formatShortPlaceAddress } from "@/lib/place-location-display"
import { PlaceCompleteness } from "@/components/admin/PlaceCompleteness"
import { ActionMenu } from "@/components/admin/ui/action-menu"
import { FilterChip, filterChipClass } from "@/components/admin/ui/filter-chip"
import { SegmentedControl } from "@/components/admin/ui/segmented-control"
import { getCategoryIcon } from "@/components/seo/CategoryIcon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCount } from "@/lib/admin-format"
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
  /** Para los contadores de las pestañas y de "Falta…". */
  counts?: AdminCounts | null
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
/** Sin foto, el avatar lleva el ícono y un color por categoría (antes todos iguales: "LA", "PA"…). */
const CATEGORY_AVATAR: Record<string, string> = {
  restaurant: "bg-terracotta/12 text-terracotta-strong",
  cafe: "bg-warning-soft text-warning",
  bakery: "bg-olive/10 text-olive",
  store: "bg-success-soft text-success",
  icecream: "bg-danger-soft text-danger",
  bar: "bg-olive text-cream",
}

function PlaceAvatar({ place }: { place: PlaceItem }) {
  if (place.photos?.[0]) {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={place.photos[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
    )
  }
  const Icon = getCategoryIcon(place.type)
  return (
    <div
      className={cn(
        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
        CATEGORY_AVATAR[place.type] ?? "bg-line text-ink-muted"
      )}
      aria-hidden
    >
      <Icon className="h-5 w-5" />
    </div>
  )
}

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

  const counts = props.counts

  // "Falta…": lo que le falta a la ficha. Los números son de los lugares publicados.
  const missingFilters: Array<{ key: string; label: string; active: boolean; set: (v: boolean) => void; count?: number }> = [
    { key: "photo", label: "Sin foto", active: placeNoPhotoFilter, set: setPlaceNoPhotoFilter, count: counts?.placesNoPhoto },
    { key: "hours", label: "Sin horarios", active: placeNoHoursFilter, set: setPlaceNoHoursFilter, count: counts?.placesNoHours },
    { key: "instagram", label: "Sin Instagram", active: placeMissingInfoFilter, set: setPlaceMissingInfoFilter, count: counts?.placesNoInstagram },
    { key: "phone", label: "Sin teléfono", active: placeNoPhoneFilter, set: setPlaceNoPhoneFilter, count: counts?.placesNoPhone },
    { key: "web", label: "Sin web", active: placeNoWebFilter, set: setPlaceNoWebFilter, count: counts?.placesNoWeb },
    { key: "description", label: "Sin descripción", active: placeNoDescriptionFilter, set: setPlaceNoDescriptionFilter, count: counts?.placesNoDescription },
    { key: "coords", label: "Sin coordenadas", active: placeNoCoordsFilter, set: setPlaceNoCoordsFilter, count: counts?.placesNoCoords },
    { key: "minima", label: "Ficha mínima (sin estado TACC)", active: placeNoTaccFilter, set: setPlaceNoTaccFilter, count: counts?.placesIncomplete },
    { key: "ficha", label: "Ficha incompleta", active: placeIncompleteFichaFilter, set: setPlaceIncompleteFichaFilter },
  ]
  const activeMissing = missingFilters.filter((f) => f.active)
  const toggleMissing = (f: (typeof missingFilters)[number]) => {
    f.set(!f.active)
    setTimeout(() => apply(), 0)
  }
  const clearMissing = () => {
    activeMissing.forEach((f) => f.set(false))
    setTimeout(() => apply(), 0)
  }

  const statusTabs = [
    { value: "", label: "Todos", count: counts?.placesTotal },
    { value: "approved", label: "Publicados", count: counts?.placesApproved },
    {
      value: "pending",
      label: "Pendientes",
      count:
        counts?.placesTotal != null && counts?.placesApproved != null
          ? Math.max(0, counts.placesTotal - counts.placesApproved)
          : undefined,
    },
  ]

  return (
    <div className="space-y-4">
      <div className={cn(adminUi.card, "space-y-3 p-4 sm:p-5")}>
        {/* 1. Estado y búsqueda */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <SegmentedControl
            ariaLabel="Estado de los lugares"
            value={placeFilter}
            onChange={(value) => {
              setPlaceFilter(value)
              apply(value)
            }}
            options={statusTabs}
          />
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <input
              type="search"
              aria-label="Buscar lugares"
              placeholder="Buscar por nombre, dirección, barrio o ciudad."
              value={placeSearch}
              onChange={(e) => setPlaceSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") apply()
              }}
              className={cn(adminUi.input, "pl-9")}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" className={adminUi.btnGhost} onClick={() => apply()}>
              Buscar
            </button>
            <button
              type="button"
              className={adminUi.btnQuiet}
              title="Bajar esta página de la lista como CSV"
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
              <Download className="h-4 w-4" aria-hidden />
              Exportar
            </button>
          </div>
        </div>

        {/* 2. Qué falta, destacados y herramientas */}
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" className={filterChipClass(activeMissing.length > 0)}>
                {activeMissing.length === 0
                  ? "Falta…"
                  : activeMissing.length === 1
                    ? activeMissing[0].label
                    : `Falta: ${activeMissing.length} cosas`}
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <p className="px-3 pb-1 pt-2 text-xs text-ink-muted">Lugares a los que les falta… (números de publicados)</p>
              {missingFilters.map((f) => (
                <DropdownMenuItem
                  key={f.key}
                  className="min-h-10 gap-2"
                  onSelect={(e) => {
                    e.preventDefault()
                    toggleMissing(f)
                  }}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      f.active ? "border-olive bg-olive text-cream" : "border-line"
                    )}
                    aria-hidden
                  >
                    {f.active ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="flex-1">{f.label}</span>
                  {f.count != null ? <span className="text-xs tabular-nums text-ink-muted">{formatCount(f.count)}</span> : null}
                </DropdownMenuItem>
              ))}
              {activeMissing.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="min-h-10" onSelect={clearMissing}>
                    Sacar estos filtros
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <FilterChip
            selected={placeFeaturedFilter}
            onClick={() => {
              setPlaceFeaturedFilter(!placeFeaturedFilter)
              setTimeout(() => apply(), 0)
            }}
          >
            Destacados
          </FilterChip>
          {placePopularFilter ? (
            <FilterChip
              selected
              onClick={() => {
                setPlacePopularFilter(false)
                setTimeout(() => apply(), 0)
              }}
            >
              Con reseñas Google
              <X className="h-3.5 w-3.5" aria-hidden />
            </FilterChip>
          ) : null}
          {activeMissing.length > 1
            ? activeMissing.map((f) => (
                <FilterChip key={f.key} selected onClick={() => toggleMissing(f)} aria-label={`Sacar ${f.label}`}>
                  {f.label}
                  <X className="h-3.5 w-3.5" aria-hidden />
                </FilterChip>
              ))
            : null}
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={placeReviewMode === "duplicates"}
              className={placeReviewMode === "duplicates" ? adminUi.chipActive : adminUi.btnQuiet}
              onClick={() => setPlaceReviewMode(placeReviewMode === "duplicates" ? null : "duplicates")}
            >
              <Users className="h-4 w-4" aria-hidden />
              Duplicados
            </button>
            <button
              type="button"
              aria-pressed={placeReviewMode === "incomplete"}
              className={placeReviewMode === "incomplete" ? adminUi.chipActive : adminUi.btnQuiet}
              onClick={() => {
                if (placeReviewMode === "incomplete") {
                  setPlaceReviewMode(null)
                  return
                }
                if (placeFilter !== "pending") {
                  setPlaceFilter("pending")
                  apply("pending")
                }
                setPlaceReviewMode("incomplete")
              }}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Investigar con IA
            </button>
          </div>
        </div>

        {/* 3. Ubicación, categoría y orden, en una sola fila */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" data-overflow-allowed="admin-ops-quick">
          <select
            value={placeProvinceFilter}
            onChange={(e) => {
              setPlaceProvinceFilter(e.target.value)
              setTimeout(() => apply(), 0)
            }}
            className={cn(adminUi.select, "shrink-0")}
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
            className={cn(adminUi.select, "shrink-0")}
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
            className={cn(adminUi.select, "shrink-0")}
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
            className={cn(adminUi.select, "shrink-0")}
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
            className={cn(adminUi.select, "shrink-0")}
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
                  <div className="flex items-start gap-3">
                    <PlaceAvatar place={place} />
                    <h3 className="min-w-0 flex-1 break-words font-semibold">{place.name}</h3>
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
                        <PlaceAvatar place={place} />
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
