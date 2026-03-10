"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { TYPES } from "@/lib/constants"
import { inferSafetyLevel, getSafetyBadge } from "@/components/featured/featured-utils"
import { SuggestionEditModal } from "@/components/admin/SuggestionEditModal"
import { PlaceEditModal } from "@/components/admin/PlaceEditModal"
import { Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"

type SuggestionItem = {
  _id: string
  placeDraft: {
    name: string
    type: string
    types?: string[]
    address: string
    neighborhood: string
    openingHours?: string
    delivery?: { available?: boolean; rappi?: string; pedidosya?: string; other?: string }
    contact?: { instagram?: string; url?: string }
    safetyLevel?: string
    tags?: string[]
  }
  suggestedByUserId?: { name?: string }
}

type ReviewItem = {
  _id: string
  placeId: { name: string; address?: string; _id: string }
  userId?: { name?: string; image?: string }
  rating: number
  comment: string
  status: "visible" | "hidden"
  pinned?: boolean
  createdAt: string
}

type PlaceItem = {
  _id: string
  name: string
  type: string
  address: string
  neighborhood: string
  status: string
  source?: "excel" | "kml" | "suggestion" | "manual"
  safetyLevel?: "dedicated_gf" | "gf_options" | "cross_contamination_risk" | "unknown"
  tags?: string[]
  photos?: string[]
  contact?: { instagram?: string; url?: string; whatsapp?: string; phone?: string }
  stats?: { avgRating: number; totalReviews: number }
}

type ContactItem = {
  _id: string
  name: string
  email: string
  subject: string
  message: string
  status: string
  createdAt: string
  userId?: { name?: string; email?: string }
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
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
  const [counts, setCounts] = useState<{ suggestionsPending: number; contactsTotal: number; placesTotal: number } | null>(null)
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<Set<string>>(new Set())
  const [reviewSearch, setReviewSearch] = useState("")
  const [contactSearch, setContactSearch] = useState("")
  const [editingSuggestion, setEditingSuggestion] = useState<SuggestionItem | null>(null)
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<"suggestions" | "reviews" | "places" | "contacts">("suggestions")

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
    if (status === "unauthenticated" || session?.user?.role !== "admin") {
      router.push("/")
      return
    }
    fetchSuggestions()
    fetchCounts()
  }, [session, status, router, fetchSuggestions])

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
  if (status === "unauthenticated" || session?.user?.role !== "admin") {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          Panel de administración
        </h1>
        <p className="text-sm text-muted-foreground">
          Hola 👋 — acá vas a ver todo lo que necesita tu atención
        </p>
      </div>

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

      {/* ══════════════════════════════════════════════════════
          SECCIÓN: SUGERENCIAS
      ══════════════════════════════════════════════════════ */}
      {activeSection === "suggestions" && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                📩 Lugares sugeridos
                {counts?.suggestionsPending != null && counts.suggestionsPending > 0 && (
                  <span className="text-[10px] bg-red-500 text-white font-bold px-2 py-0.5 rounded-full">
                    {counts.suggestionsPending} pendientes
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Revisá cada lugar antes de publicarlo. Podés editar los datos si hay algo incorrecto.
              </p>
            </div>
          </div>

          {/* Buscador */}
          <div className="px-4 py-2 border-b border-border bg-card/50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, dirección, barrio..."
                value={suggestionSearch}
                onChange={(e) => setSuggestionSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Cargando...</div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm font-medium">¡No hay sugerencias pendientes!</p>
              <p className="text-xs mt-1">Cuando alguien sugiera un lugar aparecerá acá.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {suggestions
                .filter((s) => {
                  if (!suggestionSearch.trim()) return true
                  const q = suggestionSearch.toLowerCase()
                  return (
                    s.placeDraft.name?.toLowerCase().includes(q) ||
                    s.placeDraft.address?.toLowerCase().includes(q) ||
                    s.placeDraft.neighborhood?.toLowerCase().includes(q)
                  )
                })
                .map((suggestion, idx) => (
                  <div key={suggestion._id} className="p-4 flex gap-3 items-start">
                    {/* Número */}
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold font-mono flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm mb-1">{suggestion.placeDraft.name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span>{TYPES.find((t) => t.value === (suggestion.placeDraft.types?.[0] ?? suggestion.placeDraft.type))?.emoji} {getTypeLabel(suggestion.placeDraft.types?.[0] ?? suggestion.placeDraft.type)}</span>
                        <span>·</span>
                        <span>📍 {suggestion.placeDraft.neighborhood}</span>
                        <span>·</span>
                        <span className="truncate max-w-[200px]">{suggestion.placeDraft.address}</span>
                      </div>
                      {suggestion.suggestedByUserId?.name && (
                        <p className="text-xs text-muted-foreground/60 italic mb-3">
                          Sugerido por {suggestion.suggestedByUserId.name}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="h-8 gap-1.5 bg-primary text-primary-foreground"
                          onClick={() => handleSuggestionAction(suggestion._id, "approve")}
                        >
                          ✅ Publicar lugar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5"
                          onClick={() => setEditingSuggestion(suggestion)}
                        >
                          ✏️ Revisar y editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
                          onClick={() => handleSuggestionAction(suggestion._id, "reject")}
                        >
                          ❌ Rechazar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {editingSuggestion && (
            <SuggestionEditModal
              suggestionId={editingSuggestion._id}
              placeDraft={editingSuggestion.placeDraft as any}
              open={!!editingSuggestion}
              onOpenChange={(open) => !open && setEditingSuggestion(null)}
              onSaved={fetchSuggestions}
              onApproved={fetchSuggestions}
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SECCIÓN: RESEÑAS
      ══════════════════════════════════════════════════════ */}
      {activeSection === "reviews" && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card">
            <h2 className="text-sm font-bold">⭐ Reseñas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Podés ocultar reseñas inapropiadas o destacar las más útiles con 📌
            </p>
          </div>

          {/* Filtros */}
          <div className="px-4 py-2 border-b border-border bg-card/50 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por lugar o comentario..."
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchReviews()}
                className="pl-8 h-8 text-sm"
              />
            </div>
            {[
              { label: "Todas", value: "" },
              { label: "✅ Visibles", value: "visible" },
              { label: "🙈 Ocultas", value: "hidden" },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => { setReviewFilter(f.value); fetchReviews(f.value) }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  reviewFilter === f.value
                    ? "border-primary/40 bg-primary/8 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-border/80"
                }`}
              >
                {f.label}
              </button>
            ))}
            <Button size="sm" variant="secondary" className="h-8" onClick={() => fetchReviews()}>
              Buscar
            </Button>
          </div>

          {reviewsLoading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Cargando reseñas...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No hay reseñas</div>
          ) : (
            <div className="divide-y divide-border">
              {reviews.map((review) => (
                <div key={review._id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/lugar/${review.placeId._id}`}
                        target="_blank"
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        {review.placeId.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span>{review.userId?.name || "Usuario anónimo"}</span>
                        <span>·</span>
                        <span className="text-amber-400">
                          {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                        </span>
                        <span>·</span>
                        <span>{new Date(review.createdAt).toLocaleDateString("es-AR")}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex-shrink-0 ${
                      review.status === "visible"
                        ? "bg-primary/8 text-primary border-primary/20"
                        : "bg-destructive/8 text-destructive border-destructive/20"
                    }`}>
                      {review.status === "visible" ? "✓ visible" : "✕ oculta"}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-3">
                    {review.comment}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {review.pinned ? (
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleReviewAction(review._id, "unpin")}
                      >
                        📌 Quitar destaque
                      </Button>
                    ) : (
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleReviewAction(review._id, "pin")}
                      >
                        📌 Destacar
                      </Button>
                    )}
                    {review.status === "visible" ? (
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs gap-1 text-amber-500 border-amber-500/30 hover:bg-amber-500/8"
                        onClick={() => handleReviewAction(review._id, "hide")}
                      >
                        🙈 Ocultar
                      </Button>
                    ) : (
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs gap-1 text-primary border-primary/30"
                        onClick={() => handleReviewAction(review._id, "unhide")}
                      >
                        ✅ Mostrar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SECCIÓN: LUGARES
      ══════════════════════════════════════════════════════ */}
      {activeSection === "places" && (
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
            <div className="flex flex-wrap gap-2 items-center">
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
              <button
                onClick={() => {
                  setPlaceMissingBadgeFilter(!placeMissingBadgeFilter)
                  setPlacesPage(1)
                  setTimeout(() => fetchPlaces(undefined, 1), 0)
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  placeMissingBadgeFilter
                    ? "border-amber-500/40 bg-amber-500/8 text-amber-400"
                    : "border-border bg-card text-muted-foreground"
                }`}>
                ⚠️ Sin clasificar
              </button>
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
                📭 Sin información
              </button>
              {/* Selector barrio */}
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
            </div>

            {/* Bulk actions — solo cuando hay seleccionados */}
            {selectedPlaceIds.size > 0 && (
              <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-border">
                <span className="text-xs font-semibold text-muted-foreground">
                  {selectedPlaceIds.size} seleccionado{selectedPlaceIds.size > 1 ? "s" : ""}:
                </span>
                <Button size="sm" className="h-7 text-xs" onClick={() => handleBulkAction("approve")}>
                  ✅ Publicar
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => handleBulkAction("set_safety_level", "dedicated_gf")}>
                  🟢 Marcar 100% sin TACC
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => handleBulkAction("set_safety_level", "gf_options")}>
                  🟡 Marcar opciones
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => handleBulkAction("clear_safety_level")}>
                  ⚪ Quitar clasificación
                </Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs"
                  onClick={() => handleBulkAction("delete")}>
                  🗑 Eliminar seleccionados
                </Button>
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
      )}

      {/* ══════════════════════════════════════════════════════
          SECCIÓN: CONTACTOS
      ══════════════════════════════════════════════════════ */}
      {activeSection === "contacts" && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card">
            <h2 className="text-sm font-bold">✉️ Mensajes de contacto</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mensajes que los usuarios te enviaron desde la página de contacto
            </p>
          </div>
          <div className="px-4 py-2 border-b border-border bg-card/50 flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, mensaje..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchContacts()}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button size="sm" variant="secondary" className="h-8" onClick={() => fetchContacts()}>
              Buscar
            </Button>
          </div>
          {contactsLoading ? (
            <div className="text-center py-10 text-muted-foreground text-sm">Cargando mensajes...</div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <div className="text-3xl mb-2">📭</div>
              <p className="text-sm">No hay mensajes de contacto</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {contacts.map((c) => (
                <div key={c._id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-bold">{c.subject}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.name} · {c.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(c.createdAt).toLocaleDateString("es-AR")}
                      </span>
                      <a href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject)}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                          ✉️ Responder
                        </Button>
                      </a>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {c.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
