"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { TYPES } from "@/lib/constants"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { AdminSuggestionsSection } from "@/components/admin/AdminSuggestionsSection"
import { AdminReviewsSection } from "@/components/admin/AdminReviewsSection"
import { AdminPlacesSection } from "@/components/admin/AdminPlacesSection"
import { AdminContactsSection } from "@/components/admin/AdminContactsSection"
import type {
  AdminCounts,
  AdminSection,
  ContactItem,
  PlaceItem,
  ReviewItem,
  SuggestionItem,
} from "@/components/admin/types"

type AdminDashboardProps = {
  initialCounts: AdminCounts
}

export function AdminDashboard({ initialCounts }: AdminDashboardProps) {
  const { status } = useSession()
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [places, setPlaces] = useState<PlaceItem[]>([])
  const [contacts, setContacts] = useState<ContactItem[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [placesLoading, setPlacesLoading] = useState(false)
  const [contactsLoading, setContactsLoading] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<string>("")
  const [placeFilter, setPlaceFilter] = useState<string>("")
  const [suggestionSearch, setSuggestionSearch] = useState("")
  const [placeSearch, setPlaceSearch] = useState("")
  const [placeTypeFilter, setPlaceTypeFilter] = useState("")
  const [placeNeighborhoodFilter, setPlaceNeighborhoodFilter] = useState("")
  const [placeMissingInfoFilter, setPlaceMissingInfoFilter] = useState(false)
  const [placeMissingBadgeFilter, setPlaceMissingBadgeFilter] = useState(false)
  const [placesPage, setPlacesPage] = useState(1)
  const [placesPagination, setPlacesPagination] = useState<{ total: number; page: number; pages: number } | null>(null)
  const [neighborhoods, setNeighborhoods] = useState<string[]>([])
  const [counts, setCounts] = useState<AdminCounts | null>(initialCounts)
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set())
  const [reviewSearch, setReviewSearch] = useState("")
  const [contactSearch, setContactSearch] = useState("")
  const [editingSuggestion, setEditingSuggestion] = useState<SuggestionItem | null>(null)
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<AdminSection>("suggestions")

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
    if (status === "loading") return
    fetchSuggestions()
  }, [status, fetchSuggestions])

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

  const handleSuggestionAction = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/admin/suggestions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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
    action: "approve" | "delete" | "set_safety_level" | "clear_safety_level",
    safetyLevel?: "dedicated_gf" | "gf_options"
  ) => {
    const ids = Array.from(selectedPlaceIds)
    if (ids.length === 0) {
      toast.error("Seleccioná al menos un lugar")
      return
    }
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
    <div className="container mx-auto px-4 py-8 max-w-5xl">

      <AdminHeader />

      {/* ── STATS — qué requiere acción hoy ────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
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
      </div>

      {/* ── NAVEGACIÓN — secciones con descripción ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-6">
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
            key: "reviews",
            icon: "⭐",
            label: "Reseñas",
            desc: "Moderá, destacá u ocultá comentarios",
            badge: null,
            urgent: false,
            onClick: () => { setActiveSection("reviews"); fetchReviews() },
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
            key: "contacts",
            icon: "✉️",
            label: "Mensajes",
            desc: "Leé y respondé mensajes de usuarios",
            badge: counts?.contactsTotal ?? null,
            urgent: (counts?.contactsTotal ?? 0) > 0,
            onClick: () => { setActiveSection("contacts"); fetchContacts(); fetchCounts() },
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
      </div>

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
          handleDeletePlace={handleDeletePlace}
          editingPlaceId={editingPlaceId}
          setEditingPlaceId={setEditingPlaceId}
        />
      )}

      {activeSection === "contacts" && (
        <AdminContactsSection
          contacts={contacts}
          contactsLoading={contactsLoading}
          contactSearch={contactSearch}
          setContactSearch={setContactSearch}
          fetchContacts={fetchContacts}
        />
      )}

    </div>
  )
}
