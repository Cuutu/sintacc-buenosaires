"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { TYPES } from "@/lib/constants"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { AdminSuggestionsSection } from "@/components/admin/AdminSuggestionsSection"
import { AdminVentureSuggestionsSection } from "@/components/admin/AdminVentureSuggestionsSection"
import { AdminVenturesSection } from "@/components/admin/AdminVenturesSection"
import { AdminReviewsSection } from "@/components/admin/AdminReviewsSection"
import { AdminVentureReviewsSection } from "@/components/admin/AdminVentureReviewsSection"
import { AdminPlacesSection } from "@/components/admin/AdminPlacesSection"
import { AdminFeaturedSection } from "@/components/admin/AdminFeaturedSection"
import { AdminContactsSection } from "@/components/admin/AdminContactsSection"
import { AdminSocialSection } from "@/components/admin/AdminSocialSection"
import type {
  AdminCounts,
  AdminSection,
  ContactItem,
  PlaceItem,
  ReviewItem,
  SuggestionItem,
  VentureSuggestionItem,
  VentureItem,
  VentureReviewItem,
} from "@/components/admin/types"

type AdminDashboardProps = {
  initialCounts: AdminCounts
  initialSection?: AdminSection
  hideLauncher?: boolean
}

export function AdminDashboard({
  initialCounts,
  initialSection = "suggestions",
  hideLauncher = false,
}: AdminDashboardProps) {
  const { status } = useSession()
  const urlParams = useSearchParams()
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [ventureSuggestions, setVentureSuggestions] = useState<VentureSuggestionItem[]>([])
  const [ventures, setVentures] = useState<VentureItem[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [ventureReviews, setVentureReviews] = useState<VentureReviewItem[]>([])
  const [ventureReviewsLoading, setVentureReviewsLoading] = useState(false)
  const [ventureReviewSearch, setVentureReviewSearch] = useState("")
  const [ventureReviewFilter, setVentureReviewFilter] = useState("")
  const [places, setPlaces] = useState<PlaceItem[]>([])
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [placesLoading, setPlacesLoading] = useState(false)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<string>(urlParams.get("status") === "hidden" ? "hidden" : "")
  const [suggestionSearch, setSuggestionSearch] = useState("")
  const [ventureSuggestionSearch, setVentureSuggestionSearch] = useState("")
  const [ventureSearch, setVentureSearch] = useState("")
  const [ventureSuggestionsLoading, setVentureSuggestionsLoading] = useState(false)
  const [venturesLoading, setVenturesLoading] = useState(false)
  const [placeSearch, setPlaceSearch] = useState("")
  const [placeTypeFilter, setPlaceTypeFilter] = useState("")
  const [placeNeighborhoodFilter, setPlaceNeighborhoodFilter] = useState("")
  const missingParam = urlParams.get("missing")
  const [placeFilter, setPlaceFilter] = useState(
    urlParams.get("status") === "pending" || urlParams.get("status") === "approved"
      ? urlParams.get("status") || ""
      : missingParam
        ? "approved"
        : ""
  )
  const [placeMissingInfoFilter, setPlaceMissingInfoFilter] = useState(
    urlParams.get("sinInstagram") === "1" || missingParam === "instagram"
  )
  const [placeMissingBadgeFilter, setPlaceMissingBadgeFilter] = useState(false)
  const [placeIncompleteOnlyFilter, setPlaceIncompleteOnlyFilter] = useState(false)
  const [placeNoTaccFilter, setPlaceNoTaccFilter] = useState(
    urlParams.get("incompletos") === "1" || missingParam === "incomplete"
  )
  const [placeIncompleteFichaFilter, setPlaceIncompleteFichaFilter] = useState(missingParam === "ficha")
  const [placeNoPhotoFilter, setPlaceNoPhotoFilter] = useState(
    urlParams.get("sinFoto") === "1" || missingParam === "photo"
  )
  const [placeNoHoursFilter, setPlaceNoHoursFilter] = useState(
    urlParams.get("sinHorarios") === "1" || missingParam === "hours"
  )
  const [placeNoCoordsFilter, setPlaceNoCoordsFilter] = useState(
    urlParams.get("sinCoords") === "1" || missingParam === "coords"
  )
  const [placeNoPhoneFilter, setPlaceNoPhoneFilter] = useState(missingParam === "phone")
  const [placeNoWebFilter, setPlaceNoWebFilter] = useState(missingParam === "web")
  const [placeNoDescriptionFilter, setPlaceNoDescriptionFilter] = useState(missingParam === "description")
  const [placeFeaturedFilter, setPlaceFeaturedFilter] = useState(urlParams.get("destacados") === "1")
  const [placeProvinceFilter, setPlaceProvinceFilter] = useState(urlParams.get("provincia") || "")
  const [placeLocalityFilter, setPlaceLocalityFilter] = useState(urlParams.get("ciudad") || "")
  const [placeSort, setPlaceSort] = useState(urlParams.get("orden") || "recent")
  const [placePopularFilter, setPlacePopularFilter] = useState(urlParams.get("popular") === "1")
  const [placeReviewMode, setPlaceReviewMode] = useState<
    "duplicates" | "incomplete" | "google" | null
  >(urlParams.get("google") === "1" ? "google" : null)
  const [placesPage, setPlacesPage] = useState(1)
  const [placesPagination, setPlacesPagination] = useState<{ total: number; page: number; pages: number } | null>(null)
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])
  const [provinces, setProvinces] = useState<string[]>([])
  const [localities, setLocalities] = useState<string[]>([])
  const [counts, setCounts] = useState<AdminCounts | null>(initialCounts)
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set())
  const [reviewSearch, setReviewSearch] = useState("")
  const [contactSearch, setContactSearch] = useState("")
  const [editingSuggestion, setEditingSuggestion] = useState<SuggestionItem | null>(null)
  const [editingVentureSuggestion, setEditingVentureSuggestion] =
    useState<VentureSuggestionItem | null>(null)
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(urlParams.get("editar"))
  const [activeSection, setActiveSection] = useState<AdminSection>(initialSection)

  const fetchSuggestions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: "pending" })
      if (suggestionSearch.trim()) params.set("search", suggestionSearch.trim())
      const res = await fetch(`/api/admin/suggestions?${params}`)
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error("Error fetching suggestions:", error)
    } finally {
      setLoading(false)
    }
  }, [suggestionSearch])

  useEffect(() => {
    setActiveSection(initialSection)
  }, [initialSection])

  useEffect(() => {
    if (status === "loading") return
    fetchSuggestions()
  }, [status, fetchSuggestions])

  useEffect(() => {
    if (status === "loading" || !hideLauncher) return
    if (activeSection === "places") {
      fetchPlaces()
      fetchNeighborhoods()
    }
    if (activeSection === "ventures") fetchVentures()
    if (activeSection === "ventureSuggestions") fetchVentureSuggestions()
    if (activeSection === "reviews") fetchReviews()
    if (activeSection === "ventureReviews") fetchVentureReviews()
    if (activeSection === "contacts") fetchContacts()
  }, [status, hideLauncher, activeSection])

  const fetchCounts = async () => {
    try {
      const res = await fetch("/api/admin/counts")
      if (res.ok) {
        const data = await res.json()
        setCounts(data)
      }
    } catch (e) {
      console.error("Error fetching counts:", e)
    }
  }

  const suggestionSearchMounted = useRef(false)
  useEffect(() => {
    if (!suggestionSearchMounted.current) {
      suggestionSearchMounted.current = true
      return
    }
    const t = setTimeout(fetchSuggestions, 400)
    return () => clearTimeout(t)
  }, [suggestionSearch, fetchSuggestions])

  const fetchVentureSuggestions = useCallback(async () => {
    setVentureSuggestionsLoading(true)
    try {
      const params = new URLSearchParams({ status: "pending" })
      if (ventureSuggestionSearch.trim()) {
        params.set("search", ventureSuggestionSearch.trim())
      }
      const res = await fetch(`/api/admin/venture-suggestions?${params}`)
      const data = await res.json()
      setVentureSuggestions(data.suggestions || [])
    } catch (error) {
      console.error("Error fetching venture suggestions:", error)
    } finally {
      setVentureSuggestionsLoading(false)
    }
  }, [ventureSuggestionSearch])

  useEffect(() => {
    if (status === "loading") return
    if (activeSection === "ventureSuggestions") {
      fetchVentureSuggestions()
    }
  }, [status, activeSection, fetchVentureSuggestions])

  const ventureSuggestionSearchMounted = useRef(false)
  useEffect(() => {
    if (!ventureSuggestionSearchMounted.current) {
      ventureSuggestionSearchMounted.current = true
      return
    }
    if (activeSection !== "ventureSuggestions") return
    const t = setTimeout(fetchVentureSuggestions, 400)
    return () => clearTimeout(t)
  }, [ventureSuggestionSearch, activeSection, fetchVentureSuggestions])

  const fetchVentures = useCallback(async () => {
    setVenturesLoading(true)
    try {
      const params = new URLSearchParams({ status: "approved", limit: "100" })
      const res = await fetch(`/api/admin/ventures?${params}`)
      const data = await res.json()
      setVentures(data.ventures || [])
    } catch (error) {
      console.error("Error fetching ventures:", error)
    } finally {
      setVenturesLoading(false)
    }
  }, [])

  const fetchReviews = async (status?: string) => {
    setReviewsLoading(true)
    try {
      const params = new URLSearchParams()
      const filter = status ?? reviewFilter
      if (filter) params.set("status", filter)
      if (reviewSearch.trim()) params.set("search", reviewSearch.trim())
      const res = await fetch(`/api/admin/reviews?${params}`)
      const data = await res.json()
      setReviews(data.reviews || [])
    } catch (error) {
      console.error("Error fetching reviews:", error)
    } finally {
      setReviewsLoading(false)
    }
  }

  const fetchPlaces = async (status?: string, page?: number) => {
    const p = page ?? placesPage
    setPlacesLoading(true)
    try {
      const params = new URLSearchParams()
      const filter = status ?? placeFilter
      if (filter) params.set("status", filter)
      if (placeSearch.trim()) params.set("search", placeSearch.trim())
      if (placeTypeFilter) params.set("type", placeTypeFilter)
      if (placeNeighborhoodFilter) params.set("neighborhood", placeNeighborhoodFilter)
      if (placeMissingInfoFilter) params.set("missingInfo", "1")
      if (placeMissingBadgeFilter) params.set("missingBadge", "1")
      if (placeIncompleteOnlyFilter) params.set("incompleteOnly", "1")
      if (placeNoPhotoFilter) params.set("noPhoto", "1")
      if (placeNoHoursFilter) params.set("noHours", "1")
      if (placeNoCoordsFilter) params.set("noCoords", "1")
      if (placeNoPhoneFilter) params.set("noPhone", "1")
      if (placeNoWebFilter) params.set("noWeb", "1")
      if (placeNoDescriptionFilter) params.set("noDescription", "1")
      if (placeNoTaccFilter) params.set("noTacc", "1")
      if (placeIncompleteFichaFilter) params.set("incompleteFicha", "1")
      if (placeFeaturedFilter) params.set("featured", "1")
      if (placeProvinceFilter) params.set("province", placeProvinceFilter)
      if (placeLocalityFilter) params.set("locality", placeLocalityFilter)
      if (placeSort) params.set("sort", placeSort)
      if (placePopularFilter) params.set("popular", "1")
      params.set("page", String(p))
      params.set("limit", "25")
      const res = await fetch(`/api/admin/places?${params}`)
      const data = await res.json()
      setPlaces(data.places || [])
      setPlacesPagination(data.pagination || null)
    } catch (error) {
      console.error("Error fetching places:", error)
    } finally {
      setPlacesLoading(false)
    }
  }

  const goToPlacesPage = (p: number) => {
    setPlacesPage(p)
    setTimeout(() => fetchPlaces(undefined, p), 0)
  }

  const fetchNeighborhoods = async () => {
    try {
      const res = await fetch("/api/admin/places/neighborhoods")
      if (res.ok) {
        const data = await res.json()
        setNeighborhoods(data.neighborhoods || [])
        setProvinces(data.provinces || [])
        setLocalities(data.localities || [])
      }
    } catch (e) {
      console.error("Error fetching neighborhoods:", e)
    }
  }

  const fetchContacts = async () => {
    setContactsLoading(true)
    try {
      const params = new URLSearchParams()
      if (contactSearch.trim()) params.set("search", contactSearch.trim())
      const res = await fetch(`/api/admin/contacts?${params}`)
      const data = await res.json()
      setContacts(data.contacts || [])
    } catch (error) {
      console.error("Error fetching contacts:", error)
    } finally {
      setContactsLoading(false)
    }
  }

  const handleVentureSuggestionAction = async (
    id: string,
    action: "approve" | "reject",
    rejectionReason?: string
  ) => {
    try {
      const res = await fetch(`/api/admin/venture-suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(
          action === "approve" ? "Emprendimiento publicado" : "Sugerencia rechazada"
        )
        fetchVentureSuggestions()
        fetchCounts()
      } else {
        toast.error(data.error || "Error")
      }
    } catch {
      toast.error("Error al procesar")
    }
  }

  const handleSuggestionAction = async (
    id: string,
    action: "approve" | "reject",
    rejectionReason?: string
  ) => {
    try {
      const res = await fetch(`/api/admin/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(action === "approve" ? "Sugerencia aprobada y lugar creado" : "Sugerencia rechazada")
        fetchSuggestions()
        fetchCounts()
      } else {
        toast.error(data.error || "Error al procesar")
      }
    } catch (error) {
      toast.error("Error al procesar sugerencia")
    }
  }

  const fetchVentureReviews = async (status?: string) => {
    setVentureReviewsLoading(true)
    try {
      const params = new URLSearchParams()
      const filter = status ?? ventureReviewFilter
      if (filter) params.set("status", filter)
      if (ventureReviewSearch.trim()) params.set("search", ventureReviewSearch.trim())
      const res = await fetch(`/api/admin/venture-reviews?${params}`)
      const data = await res.json()
      setVentureReviews(data.reviews || [])
    } catch (error) {
      console.error("Error fetching venture reviews:", error)
    } finally {
      setVentureReviewsLoading(false)
    }
  }

  const handleVentureReviewAction = async (
    id: string,
    action: "hide" | "unhide" | "pin" | "unpin"
  ) => {
    try {
      const res = await fetch(`/api/admin/venture-reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Listo")
        fetchVentureReviews()
      } else {
        toast.error(data.error || "Error")
      }
    } catch {
      toast.error("Error al actualizar reseña")
    }
  }

  const handleReviewAction = async (id: string, action: "hide" | "unhide" | "pin" | "unpin") => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Listo")
        fetchReviews()
      } else {
        toast.error(data.error || "Error")
      }
    } catch (error) {
      toast.error("Error al actualizar reseña")
    }
  }

  const handleBulkAction = async (
    action: "approve" | "unpublish" | "delete" | "set_safety_level" | "clear_safety_level",
    safetyLevel?: "dedicated_gf" | "gf_options"
  ) => {
    const ids = Array.from(selectedPlaceIds)
    if (ids.length === 0) {
      toast.error("Seleccioná al menos un lugar")
      return
    }
    if (action === "unpublish" && !confirm(`¿Despublicar ${ids.length} lugar(es)? Van a pasar a pendiente.`)) return
    if (action === "delete" && !confirm(`¿Eliminar ${ids.length} lugar(es)? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch("/api/admin/places/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action, safetyLevel }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Listo")
        setSelectedPlaceIds(new Set())
        fetchPlaces()
        fetchCounts()
      } else {
        toast.error(data.error || "Error")
      }
    } catch (e) {
      toast.error("Error al procesar")
    }
  }

  const handleBulkResearch = async () => {
    const ids = Array.from(selectedPlaceIds)
    if (ids.length === 0) {
      toast.error("Seleccioná al menos un lugar")
      return
    }
    try {
      const res = await fetch("/api/admin/places/enrichment-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, catalog: "all" }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || "Investigación en cola")
        setPlaceFilter("pending")
        setPlaceReviewMode("incomplete")
        fetchPlaces()
      } else {
        toast.error(data.error || "Error al investigar")
      }
    } catch (e) {
      toast.error("Error al investigar")
    }
  }

  const togglePlaceSelection = (id: string) => {
    setSelectedPlaceIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllPlaces = () => {
    if (selectedPlaceIds.size === places.length) {
      setSelectedPlaceIds(new Set())
    } else {
      setSelectedPlaceIds(new Set(places.map((p) => p._id)))
    }
  }

  const handleDuplicatePlace = async (place: PlaceItem) => {
    if (!Number.isFinite(place.location?.lat) || !Number.isFinite(place.location?.lng)) {
      toast.error("Este lugar no tiene coordenadas para copiar")
      return
    }
    try {
      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${place.name} (copia)`,
          type: place.type || "other",
          address: place.address,
          neighborhood: place.neighborhood,
          location: place.location,
          openingHours: place.openingHours,
          contact: place.contact,
          photos: place.photos,
          safetyLevel: place.safetyLevel,
          tags: place.tags,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudo duplicar")
      toast.success("Copia creada")
      fetchPlaces()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al duplicar")
    }
  }

  const handleDeletePlace = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch(`/api/places/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Lugar eliminado")
        fetchPlaces()
        fetchCounts()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error")
      }
    } catch (error) {
      toast.error("Error al eliminar")
    }
  }

  const getTypeLabel = (type: string) => TYPES.find((t) => t.value === type)?.label || type

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }
  return (
    <div className={hideLauncher ? "max-w-6xl" : "container mx-auto px-4 py-8 max-w-5xl"}>

      {!hideLauncher && <AdminHeader />}

      {!hideLauncher && <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {/* Sugerencias pendientes — urgente si > 0 */}
        <button
          onClick={() => setActiveSection("suggestions")}
          className={`rounded-xl border p-4 text-left transition-all hover:border-border ${
            (counts?.suggestionsPending ?? 0) > 0
              ? "border-red-500/30 bg-red-500/5"
              : "border-border bg-card"
          }`}
        >
          <div className="text-2xl mb-2">📩</div>
          <div className={`text-2xl font-extrabold leading-none mb-1 ${
            (counts?.suggestionsPending ?? 0) > 0 ? "text-red-400" : "text-foreground"
          }`}>
            {counts?.suggestionsPending ?? suggestions.length}
          </div>
          <div className="text-xs text-muted-foreground leading-snug">
            Lugares sugeridos esperando revisión
          </div>
        </button>

        {/* Contactos — urgente si > 0 */}
        <button
          onClick={() => { setActiveSection("contacts"); fetchContacts(); fetchCounts() }}
          className={`rounded-xl border p-4 text-left transition-all hover:border-border ${
            (counts?.contactsTotal ?? 0) > 0
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-border bg-card"
          }`}
        >
          <div className="text-2xl mb-2">✉️</div>
          <div className={`text-2xl font-extrabold leading-none mb-1 ${
            (counts?.contactsTotal ?? 0) > 0 ? "text-amber-400" : "text-foreground"
          }`}>
            {counts?.contactsTotal ?? contacts.length}
          </div>
          <div className="text-xs text-muted-foreground leading-snug">
            Mensajes de contacto
          </div>
        </button>

        {/* Lugares totales */}
        <button
          onClick={() => { setActiveSection("places"); fetchPlaces(); fetchNeighborhoods() }}
          className="rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border/80"
        >
          <div className="text-2xl mb-2">📍</div>
          <div className="text-2xl font-extrabold leading-none mb-1">
            {placesPagination?.total ?? counts?.placesTotal ?? 0}
          </div>
          <div className="text-xs text-muted-foreground leading-snug">
            Lugares publicados en el mapa
          </div>
        </button>

        {/* Reseñas */}
        <button
          onClick={() => { setActiveSection("reviews"); fetchReviews() }}
          className="rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-border/80"
        >
          <div className="text-2xl mb-2">⭐</div>
          <div className="text-2xl font-extrabold leading-none mb-1">
            {reviews.length > 0 ? reviews.length : "—"}
          </div>
          <div className="text-xs text-muted-foreground leading-snug">
            Reseñas de usuarios
          </div>
        </button>
      </div>}

      {!hideLauncher && <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {[
          {
            key: "suggestions",
            icon: "📩",
            label: "Lugares sugeridos",
            desc: "Revisá y publicá sugerencias de la comunidad",
            badge: counts?.suggestionsPending ?? suggestions.length,
            urgent: (counts?.suggestionsPending ?? 0) > 0,
            onClick: () => setActiveSection("suggestions"),
          },
          {
            key: "ventureSuggestions",
            icon: "🧁",
            label: "Emprend. sugeridos",
            desc: "Marcas sin local físico",
            badge: counts?.ventureSuggestionsPending ?? ventureSuggestions.length,
            urgent: (counts?.ventureSuggestionsPending ?? 0) > 0,
            onClick: () => {
              setActiveSection("ventureSuggestions")
              fetchVentureSuggestions()
            },
          },
          {
            key: "ventures",
            icon: "🏪",
            label: "Emprendimientos",
            desc: "Publicados en el listado",
            badge: ventures.length || null,
            urgent: false,
            onClick: () => {
              setActiveSection("ventures")
              fetchVentures()
            },
          },
          {
            key: "reviews",
            icon: "⭐",
            label: "Reseñas lugares",
            desc: "Mapa y locales",
            badge: null,
            urgent: false,
            onClick: () => { setActiveSection("reviews"); fetchReviews() },
          },
          {
            key: "ventureReviews",
            icon: "💬",
            label: "Reseñas emprend.",
            desc: "Opiniones de marcas",
            badge: ventureReviews.length || null,
            urgent: false,
            onClick: () => {
              setActiveSection("ventureReviews")
              fetchVentureReviews()
            },
          },
          {
            key: "places",
            icon: "📍",
            label: "Lugares",
            desc: "Editá o eliminá lugares del mapa",
            badge: placesPagination?.total ?? counts?.placesTotal ?? null,
            urgent: false,
            onClick: () => { setActiveSection("places"); fetchPlaces(); fetchNeighborhoods() },
          },
          {
            key: "featured",
            icon: "⭐",
            label: "Destacados",
            desc: "Elegí los lugares del carrusel home",
            badge: null,
            urgent: false,
            onClick: () => setActiveSection("featured"),
          },
          {
            key: "contacts",
            icon: "✉️",
            label: "Mensajes",
            desc: "Leé y respondé mensajes de usuarios",
            badge: counts?.contactsTotal ?? null,
            urgent: (counts?.contactsTotal ?? 0) > 0,
            onClick: () => { setActiveSection("contacts"); fetchContacts(); fetchCounts() },
          },
          {
            key: "social",
            icon: "📱",
            label: "Redes",
            desc: "Caption + prompt ChatGPT para historia IG",
            badge: null,
            urgent: false,
            onClick: () => setActiveSection("social"),
          },
        ].map((item) => (
          <button
            key={item.key}
            onClick={item.onClick}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              activeSection === item.key
                ? "border-primary/40 bg-primary/8"
                : "border-border bg-card hover:border-border/80"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
              item.urgent ? "bg-red-500/10" : "bg-muted"
            }`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold flex items-center gap-2">
                {item.label}
                {item.badge != null && item.badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.urgent
                      ? "bg-red-500 text-white"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.desc}</div>
            </div>
          </button>
        ))}
      </div>}

      {activeSection === "suggestions" && (
        <AdminSuggestionsSection
          counts={counts}
          suggestions={suggestions}
          loading={loading}
          suggestionSearch={suggestionSearch}
          setSuggestionSearch={setSuggestionSearch}
          handleSuggestionAction={handleSuggestionAction}
          editingSuggestion={editingSuggestion}
          setEditingSuggestion={setEditingSuggestion}
          fetchSuggestions={fetchSuggestions}
          getTypeLabel={getTypeLabel}
        />
      )}

      {activeSection === "ventureSuggestions" && (
        <AdminVentureSuggestionsSection
          counts={counts}
          suggestions={ventureSuggestions}
          loading={ventureSuggestionsLoading}
          search={ventureSuggestionSearch}
          setSearch={setVentureSuggestionSearch}
          handleAction={handleVentureSuggestionAction}
          editing={editingVentureSuggestion}
          setEditing={setEditingVentureSuggestion}
          fetchSuggestions={fetchVentureSuggestions}
        />
      )}

      {activeSection === "ventures" && (
        <AdminVenturesSection
          ventures={ventures}
          loading={venturesLoading}
          search={ventureSearch}
          setSearch={setVentureSearch}
          fetchVentures={fetchVentures}
        />
      )}

      {activeSection === "reviews" && (
        <AdminReviewsSection
          reviews={reviews}
          reviewsLoading={reviewsLoading}
          reviewSearch={reviewSearch}
          setReviewSearch={setReviewSearch}
          reviewFilter={reviewFilter}
          setReviewFilter={setReviewFilter}
          fetchReviews={fetchReviews}
          handleReviewAction={handleReviewAction}
        />
      )}

      {activeSection === "ventureReviews" && (
        <AdminVentureReviewsSection
          reviews={ventureReviews}
          loading={ventureReviewsLoading}
          search={ventureReviewSearch}
          setSearch={setVentureReviewSearch}
          filter={ventureReviewFilter}
          setFilter={setVentureReviewFilter}
          fetchReviews={fetchVentureReviews}
          handleAction={handleVentureReviewAction}
        />
      )}

      {activeSection === "places" && (
        <AdminPlacesSection
          places={places}
          placesLoading={placesLoading}
          placeSearch={placeSearch}
          setPlaceSearch={setPlaceSearch}
          placeFilter={placeFilter}
          setPlaceFilter={setPlaceFilter}
          placeNeighborhoodFilter={placeNeighborhoodFilter}
          setPlaceNeighborhoodFilter={setPlaceNeighborhoodFilter}
          placeTypeFilter={placeTypeFilter}
          setPlaceTypeFilter={setPlaceTypeFilter}
          placeMissingInfoFilter={placeMissingInfoFilter}
          setPlaceMissingInfoFilter={setPlaceMissingInfoFilter}
          placeMissingBadgeFilter={placeMissingBadgeFilter}
          setPlaceMissingBadgeFilter={setPlaceMissingBadgeFilter}
          placesPage={placesPage}
          setPlacesPage={setPlacesPage}
          placesPagination={placesPagination}
          neighborhoods={neighborhoods}
          selectedPlaceIds={selectedPlaceIds}
          togglePlaceSelection={togglePlaceSelection}
          toggleAllPlaces={toggleAllPlaces}
          fetchPlaces={fetchPlaces}
          goToPlacesPage={goToPlacesPage}
          handleBulkAction={handleBulkAction}
          handleBulkResearch={handleBulkResearch}
          handleDeletePlace={handleDeletePlace}
          handleDuplicatePlace={handleDuplicatePlace}
          placeNoPhotoFilter={placeNoPhotoFilter}
          setPlaceNoPhotoFilter={setPlaceNoPhotoFilter}
          placeNoHoursFilter={placeNoHoursFilter}
          setPlaceNoHoursFilter={setPlaceNoHoursFilter}
          placeNoCoordsFilter={placeNoCoordsFilter}
          setPlaceNoCoordsFilter={setPlaceNoCoordsFilter}
          placeNoPhoneFilter={placeNoPhoneFilter}
          setPlaceNoPhoneFilter={setPlaceNoPhoneFilter}
          placeNoWebFilter={placeNoWebFilter}
          setPlaceNoWebFilter={setPlaceNoWebFilter}
          placeNoDescriptionFilter={placeNoDescriptionFilter}
          setPlaceNoDescriptionFilter={setPlaceNoDescriptionFilter}
          placeNoTaccFilter={placeNoTaccFilter}
          setPlaceNoTaccFilter={setPlaceNoTaccFilter}
          placeIncompleteFichaFilter={placeIncompleteFichaFilter}
          setPlaceIncompleteFichaFilter={setPlaceIncompleteFichaFilter}
          placeFeaturedFilter={placeFeaturedFilter}
          setPlaceFeaturedFilter={setPlaceFeaturedFilter}
          placeProvinceFilter={placeProvinceFilter}
          setPlaceProvinceFilter={setPlaceProvinceFilter}
          placeLocalityFilter={placeLocalityFilter}
          setPlaceLocalityFilter={setPlaceLocalityFilter}
          placeSort={placeSort}
          setPlaceSort={setPlaceSort}
          placePopularFilter={placePopularFilter}
          setPlacePopularFilter={setPlacePopularFilter}
          provinces={provinces}
          localities={localities}
          editingPlaceId={editingPlaceId}
          setEditingPlaceId={setEditingPlaceId}
          placeIncompleteOnlyFilter={placeIncompleteOnlyFilter}
          setPlaceIncompleteOnlyFilter={setPlaceIncompleteOnlyFilter}
          placeReviewMode={placeReviewMode}
          setPlaceReviewMode={setPlaceReviewMode}
        />
      )}

      {activeSection === "featured" && <AdminFeaturedSection />}

      {activeSection === "contacts" && (
        <AdminContactsSection
          contacts={contacts}
          contactsLoading={contactsLoading}
          contactSearch={contactSearch}
          setContactSearch={setContactSearch}
          fetchContacts={fetchContacts}
        />
      )}

      {activeSection === "social" && <AdminSocialSection />}

    </div>
  )
}
