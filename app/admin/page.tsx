"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { TYPES } from "@/lib/constants"
import { inferSafetyLevel, getSafetyBadge } from "@/components/featured/featured-utils"
import { SuggestionEditModal } from "@/components/admin/SuggestionEditModal"
import { PlaceEditModal } from "@/components/admin/PlaceEditModal"
import { Eye, EyeOff, Trash2, ExternalLink, Pin, PinOff, Mail, Pencil, Search, ChevronLeft, ChevronRight } from "lucide-react"
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Panel de administración</h1>

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">
            Sugerencias ({counts?.suggestionsPending ?? suggestions.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" onClick={() => fetchReviews()}>
            Reseñas
          </TabsTrigger>
          <TabsTrigger value="places" onClick={() => { fetchPlaces(); fetchNeighborhoods(); }}>
            Lugares ({placesPagination?.total ?? counts?.placesTotal ?? 0})
          </TabsTrigger>
          <TabsTrigger value="contacts" onClick={() => { fetchContacts(); fetchCounts(); }}>
            Contactos ({counts?.contactsTotal ?? contacts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, dirección, localidad..."
                value={suggestionSearch}
                onChange={(e) => setSuggestionSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : suggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay sugerencias pendientes
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion: SuggestionItem) => (
                <Card key={suggestion._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{suggestion.placeDraft.name}</CardTitle>
                      <Badge variant="secondary">
                        {(suggestion.suggestedByUserId as any)?.name || "Usuario"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p>
                        <strong>Tipo:</strong>{" "}
                        {(() => {
                          const draft = suggestion.placeDraft as Record<string, unknown>
                          const types = draft.types as string[] | undefined
                          return Array.isArray(types) && types.length
                            ? types.map((t) => getTypeLabel(t)).join(", ")
                            : getTypeLabel(suggestion.placeDraft.type)
                        })()}
                      </p>
                      <p>
                        <strong>Dirección:</strong> {suggestion.placeDraft.address}
                      </p>
                      <p>
                        <strong>Localidad:</strong> {suggestion.placeDraft.neighborhood}
                      </p>
                      {suggestion.placeDraft.openingHours && (
                        <p>
                          <strong>Horario:</strong> {suggestion.placeDraft.openingHours}
                        </p>
                      )}
                      {suggestion.placeDraft.delivery?.available && (
                        <p>
                          <strong>Delivery:</strong>{" "}
                          {[
                            suggestion.placeDraft.delivery.rappi && "Rappi",
                            suggestion.placeDraft.delivery.pedidosya && "PedidosYa",
                            suggestion.placeDraft.delivery.other && "Otro",
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      {(suggestion.placeDraft.contact?.instagram || suggestion.placeDraft.contact?.url) && (
                        <p>
                          <strong>Link:</strong>{" "}
                          {suggestion.placeDraft.contact?.instagram ? (
                            <a
                              href={suggestion.placeDraft.contact.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Instagram
                            </a>
                          ) : suggestion.placeDraft.contact?.url ? (
                            <a
                              href={suggestion.placeDraft.contact.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Google Maps
                            </a>
                          ) : null}
                        </p>
                      )}
                      {suggestion.placeDraft.safetyLevel && (
                        <p>
                          <strong>Nivel:</strong>{" "}
                          {suggestion.placeDraft.safetyLevel === "dedicated_gf"
                            ? "100% sin TACC"
                            : "Opciones sin TACC"}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingSuggestion(suggestion)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => handleSuggestionAction(suggestion._id, "approve")}
                        variant="default"
                      >
                        Aprobar
                      </Button>
                      <Button
                        onClick={() => handleSuggestionAction(suggestion._id, "reject")}
                        variant="destructive"
                      >
                        Rechazar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por lugar, comentario..."
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchReviews()}
                className="pl-9"
              />
            </div>
            <Button
              variant={reviewFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setReviewFilter("")
                fetchReviews("")
              }}
            >
              Todas
            </Button>
            <Button
              variant={reviewFilter === "visible" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setReviewFilter("visible")
                fetchReviews("visible")
              }}
            >
              Visibles
            </Button>
            <Button
              variant={reviewFilter === "hidden" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setReviewFilter("hidden")
                fetchReviews("hidden")
              }}
            >
              Ocultas
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fetchReviews()}>
              Buscar
            </Button>
          </div>
          {reviewsLoading ? (
            <div className="text-center py-8">Cargando reseñas...</div>
          ) : reviews.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay reseñas
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review: ReviewItem) => (
                <Card key={review._id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {review.placeId?.name} — {review.userId?.name || "Anónimo"}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {review.comment}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{review.rating} ⭐</Badge>
                          <Badge variant={review.status === "visible" ? "default" : "outline"}>
                            {review.status === "visible" ? "Visible" : "Oculta"}
                          </Badge>
                          {review.pinned && (
                            <Badge variant="secondary">Fijado</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link href={`/lugar/${review.placeId?._id}`} target="_blank">
                          <Button variant="ghost" size="icon">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        {review.pinned ? (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleReviewAction(review._id, "unpin")}
                            title="Desfijar"
                          >
                            <PinOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleReviewAction(review._id, "pin")}
                            title="Fijar comentario"
                          >
                            <Pin className="h-4 w-4" />
                          </Button>
                        )}
                        {review.status === "visible" ? (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleReviewAction(review._id, "hide")}
                            title="Ocultar"
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleReviewAction(review._id, "unhide")}
                            title="Mostrar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="places" className="mt-4">
          <div className="flex items-center justify-between gap-2 mb-2 text-sm">
            {placesPagination && (
              <>
                <span className="font-medium text-foreground">
                  {placesPagination.total} lugares
                  {placesPagination.pages > 1 && (
                    <span className="text-muted-foreground font-normal ml-2">
                      · Página {placesPagination.page} de {placesPagination.pages}
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, dirección, localidad..."
                value={placeSearch}
                onChange={(e) => setPlaceSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchPlaces()}
                className="pl-9"
              />
            </div>
            <select
              value={placeTypeFilter}
              onChange={(e) => {
                setPlaceTypeFilter(e.target.value)
                setPlacesPage(1)
                setTimeout(() => fetchPlaces(undefined, 1), 0)
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos los tipos</option>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.emoji} {t.label}
                </option>
              ))}
            </select>
            <select
              value={placeNeighborhoodFilter}
              onChange={(e) => {
                setPlaceNeighborhoodFilter(e.target.value)
                setPlacesPage(1)
                setTimeout(() => fetchPlaces(undefined, 1), 0)
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todas las localidades</option>
              {neighborhoods.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={placeMissingInfoFilter}
                onChange={(e) => {
                  setPlaceMissingInfoFilter(e.target.checked)
                  setPlacesPage(1)
                  setTimeout(() => fetchPlaces(undefined, 1), 0)
                }}
                className="rounded"
              />
              Les falta info (sin Instagram)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={placeMissingBadgeFilter}
                onChange={(e) => {
                  setPlaceMissingBadgeFilter(e.target.checked)
                  setPlacesPage(1)
                  setTimeout(() => fetchPlaces(undefined, 1), 0)
                }}
                className="rounded"
              />
              Sin badge (sin TACC/opciones/certificado)
            </label>
            <Button
              variant={placeFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPlaceFilter("")
                setPlacesPage(1)
                fetchPlaces("", 1)
              }}
            >
              Todos
            </Button>
            <Button
              variant={placeFilter === "approved" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPlaceFilter("approved")
                setPlacesPage(1)
                fetchPlaces("approved", 1)
              }}
            >
              Aprobados
            </Button>
            <Button
              variant={placeFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPlaceFilter("pending")
                setPlacesPage(1)
                fetchPlaces("pending", 1)
              }}
            >
              Pendientes
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fetchPlaces(undefined, placesPage)}>
              Buscar
            </Button>
            {selectedPlaceIds.size > 0 && (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">{selectedPlaceIds.size} seleccionados</span>
                <Button size="sm" variant="default" onClick={() => handleBulkAction("approve")}>
                  Aprobar seleccionados
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("set_safety_level", "dedicated_gf")}
                >
                  Marcar 100% sin TACC
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("set_safety_level", "gf_options")}
                >
                  Marcar opciones
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("clear_safety_level")}
                >
                  Quitar badge
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulkAction("delete")}>
                  Eliminar seleccionados
                </Button>
              </div>
            )}
          </div>
          {placesLoading ? (
            <div className="text-center py-8">Cargando lugares...</div>
          ) : places.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay lugares
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {places.length > 0 && (
                <div className="flex items-center gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={selectedPlaceIds.size === places.length && places.length > 0}
                    onChange={toggleAllPlaces}
                    className="rounded"
                  />
                  <span className="text-sm text-muted-foreground">Seleccionar todos</span>
                </div>
              )}
              {places.map((place: PlaceItem) => (
                <Card
                  key={place._id}
                  className={
                    (() => {
                      const l = inferSafetyLevel(place)
                      return !l || l === "unknown" ? "ring-1 ring-amber-500/30" : undefined
                    })()
                  }
                >
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedPlaceIds.has(place._id)}
                          onChange={() => togglePlaceSelection(place._id)}
                          className="rounded mt-1 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{place.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getTypeLabel(place.type)} · {place.neighborhood}
                          </p>
                          {(place.contact?.instagram || place.contact?.url) && (
                            <p className="text-xs mt-1">
                              {place.contact?.instagram ? (
                                <a
                                  href={place.contact.instagram.startsWith("http") ? place.contact.instagram : `https://instagram.com/${place.contact.instagram.replace(/^@/, "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  {place.contact.instagram.includes("/") ? place.contact.instagram.split("/").pop() : place.contact.instagram.replace(/^@/, "")}
                                </a>
                              ) : place.contact?.url ? (
                                <a href={place.contact.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                  Web
                                </a>
                              ) : null}
                            </p>
                          )}
                          {place.stats && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {place.stats.avgRating} ⭐ · {place.stats.totalReviews} reseñas
                            </p>
                          )}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {(() => {
                              const level = inferSafetyLevel(place)
                              const cfg = getSafetyBadge(level)
                              const hasBadge = level && level !== "unknown"
                              return (
                                <Badge
                                  variant="outline"
                                  className={hasBadge ? cfg.className : "border-amber-500/60 bg-amber-500/15 text-amber-600 dark:text-amber-400"}
                                  title={hasBadge ? cfg.label : "Sin clasificar — asignar 100% sin TACC, Opciones o Certificado"}
                                >
                                  {cfg.dot} {cfg.label}
                                </Badge>
                              )
                            })()}
                            <Badge variant={place.status === "approved" ? "default" : "secondary"}>
                              {place.status}
                            </Badge>
                            {place.source && (
                              <Badge variant="outline">{place.source}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setEditingPlaceId(place._id)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Link href={`/lugar/${place._id}`} target="_blank">
                          <Button variant="ghost" size="icon" title="Ver en vista pública">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeletePlace(place._id, place.name)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {placesPagination && placesPagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pb-4">
              <Button
                variant="outline"
                size="sm"
                disabled={placesPagination.page <= 1}
                onClick={() => goToPlacesPage(placesPagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Página {placesPagination.page} de {placesPagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={placesPagination.page >= placesPagination.pages}
                onClick={() => goToPlacesPage(placesPagination.page + 1)}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
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
        </TabsContent>

        <TabsContent value="contacts" className="mt-4">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email, asunto, mensaje..."
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchContacts()}
                className="pl-9"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={() => fetchContacts()}>
              Buscar
            </Button>
          </div>
          {contactsLoading ? (
            <div className="text-center py-8">Cargando contactos...</div>
          ) : contacts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay mensajes de contacto
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {contacts.map((c: ContactItem) => (
                <Card key={c._id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{c.subject}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {c.name} · {c.email}
                        </p>
                        <p className="text-sm mt-2 whitespace-pre-wrap">{c.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(c.createdAt).toLocaleString("es-AR")}
                        </p>
                      </div>
                      <a href={`mailto:${c.email}?subject=Re: ${encodeURIComponent(c.subject)}`}>
                        <Button variant="outline" size="sm">
                          Responder
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
