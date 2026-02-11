"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { TYPES, NEIGHBORHOODS } from "@/lib/constants"
import { SuggestionEditModal } from "@/components/admin/SuggestionEditModal"
import { PlaceEditModal } from "@/components/admin/PlaceEditModal"
import { Eye, EyeOff, Trash2, ExternalLink, Pin, PinOff, Mail, Pencil, Search } from "lucide-react"
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
  const { data: session } = useSession()
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
  const [reviewSearch, setReviewSearch] = useState("")
  const [contactSearch, setContactSearch] = useState("")
  const [editingSuggestion, setEditingSuggestion] = useState<SuggestionItem | null>(null)
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.role !== "admin") {
      router.push("/")
      return
    }
    fetchSuggestions()
  }, [session, router])

  const fetchSuggestions = async () => {
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
  }

  const suggestionSearchMounted = useRef(false)
  useEffect(() => {
    if (!suggestionSearchMounted.current) {
      suggestionSearchMounted.current = true
      return
    }
    const t = setTimeout(fetchSuggestions, 400)
    return () => clearTimeout(t)
  }, [suggestionSearch])

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

  const fetchPlaces = async (status?: string) => {
    setPlacesLoading(true)
    try {
      const params = new URLSearchParams()
      const filter = status ?? placeFilter
      if (filter) params.set("status", filter)
      if (placeSearch.trim()) params.set("search", placeSearch.trim())
      if (placeTypeFilter) params.set("type", placeTypeFilter)
      if (placeNeighborhoodFilter) params.set("neighborhood", placeNeighborhoodFilter)
      const res = await fetch(`/api/admin/places?${params}`)
      const data = await res.json()
      setPlaces(data.places || [])
    } catch (error) {
      console.error("Error fetching places:", error)
    } finally {
      setPlacesLoading(false)
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

  const handleDeletePlace = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch(`/api/places/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Lugar eliminado")
        fetchPlaces()
      } else {
        const data = await res.json()
        toast.error(data.error || "Error")
      }
    } catch (error) {
      toast.error("Error al eliminar")
    }
  }

  const getTypeLabel = (type: string) => TYPES.find((t) => t.value === type)?.label || type

  if (session?.user?.role !== "admin") {
    return null
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Panel de administración</h1>

      <Tabs defaultValue="suggestions">
        <TabsList>
          <TabsTrigger value="suggestions">Sugerencias ({suggestions.length})</TabsTrigger>
          <TabsTrigger value="reviews" onClick={() => fetchReviews()}>
            Reseñas
          </TabsTrigger>
          <TabsTrigger value="places" onClick={() => fetchPlaces()}>
            Lugares
          </TabsTrigger>
          <TabsTrigger value="contacts" onClick={() => fetchContacts()}>
            Contactos ({contacts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="mt-4">
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, dirección, barrio..."
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
                        <strong>Barrio:</strong> {suggestion.placeDraft.neighborhood}
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
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, dirección, barrio..."
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
                setTimeout(() => fetchPlaces(), 0)
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
                setTimeout(() => fetchPlaces(), 0)
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos los barrios</option>
              {NEIGHBORHOODS.filter((n) => n !== "Otro").map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <Button
              variant={placeFilter === "" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPlaceFilter("")
                fetchPlaces("")
              }}
            >
              Todos
            </Button>
            <Button
              variant={placeFilter === "approved" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPlaceFilter("approved")
                fetchPlaces("approved")
              }}
            >
              Aprobados
            </Button>
            <Button
              variant={placeFilter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setPlaceFilter("pending")
                fetchPlaces("pending")
              }}
            >
              Pendientes
            </Button>
            <Button size="sm" variant="secondary" onClick={() => fetchPlaces()}>
              Buscar
            </Button>
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
              {places.map((place: PlaceItem) => (
                <Card key={place._id}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{place.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getTypeLabel(place.type)} · {place.neighborhood}
                        </p>
                        {place.stats && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {place.stats.avgRating} ⭐ · {place.stats.totalReviews} reseñas
                          </p>
                        )}
                        <Badge variant={place.status === "approved" ? "default" : "secondary"} className="mt-2">
                          {place.status}
                        </Badge>
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
          {editingPlaceId && (
            <PlaceEditModal
              placeId={editingPlaceId}
              open={!!editingPlaceId}
              onOpenChange={(open) => !open && setEditingPlaceId(null)}
              onSaved={() => {
                fetchPlaces(placeFilter || undefined)
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
