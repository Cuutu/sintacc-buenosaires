"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReviewForm } from "@/components/review-form"
import { SafetyBadge } from "@/components/safety-badge"
import { FavoriteButton } from "@/components/favorite-button"
import { IPlace } from "@/models/Place"
import { IReview } from "@/models/Review"
import { Star, MapPin, Phone, Instagram, Globe, ExternalLink, Share2, MapPinned } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { TYPES } from "@/lib/constants"

export default function LugarPage() {
  const params = useParams()
  const [place, setPlace] = useState<IPlace & { stats?: any } | null>(null)
  const [reviews, setReviews] = useState<IReview[]>([])
  const [reviewSort, setReviewSort] = useState<"recent" | "rating">("recent")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      fetchPlace()
      fetchReviews()
    }
  }, [params.id])

  const fetchPlace = async () => {
    try {
      const res = await fetch(`/api/places/${params.id}`)
      const data = await res.json()
      setPlace(data)
    } catch (error) {
      console.error("Error fetching place:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?placeId=${params.id}`)
      const data = await res.json()
      setReviews(data.reviews || [])
    } catch (error) {
      console.error("Error fetching reviews:", error)
    }
  }

  const sortedReviews = [...reviews].sort((a, b) => {
    if (reviewSort === "rating") return (b as any).rating - (a as any).rating
    return new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime()
  })

  const openInMaps = () => {
    if (!place) return
    const url = `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`
    window.open(url, "_blank")
  }

  const shareLink = () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    navigator.clipboard.writeText(url)
    toast.success("Link copiado al portapapeles")
  }

  const shareWhatsApp = () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    window.open(`https://wa.me/?text=${encodeURIComponent(`Mirá este lugar sin TACC: ${place?.name} ${url}`)}`, "_blank")
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-lg" />
          <div className="h-8 w-2/3 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (!place) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-2xl font-bold mb-2">Lugar no encontrado</h2>
          <p className="text-muted-foreground">El lugar que buscás no existe o fue eliminado.</p>
        </div>
      </div>
    )
  }

  const typeConfig = TYPES.find((t) => t.value === place.type)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Photos */}
        <div className="space-y-2">
          {place.photos && place.photos.length > 0 ? (
            <>
              <div className="relative h-64 w-full rounded-lg overflow-hidden">
                <Image
                  src={place.photos[0]}
                  alt={place.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              {place.photos.length > 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {place.photos.slice(1, 4).map((photo, idx) => (
                    <div key={idx} className="relative h-24 w-full rounded overflow-hidden">
                      <Image
                        src={photo}
                        alt={`${place.name} ${idx + 2}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="relative h-64 w-full rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-8xl">{typeConfig?.emoji || "📍"}</span>
              <span className="absolute bottom-2 left-2 px-2 py-1 rounded bg-white/90 text-sm font-medium">
                {typeConfig?.label || "Lugar"}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold">{place.name}</h1>
            <div className="flex gap-2">
              <FavoriteButton placeId={place._id.toString()} />
              <Button variant="outline" size="icon" onClick={shareLink} title="Copiar link">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={shareWhatsApp} title="Compartir en WhatsApp">
                <span className="text-lg">📱</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              {place.address}, {place.neighborhood}
            </span>
          </div>

          <Button variant="outline" className="mb-4" onClick={openInMaps}>
            <MapPinned className="h-4 w-4 mr-2" />
            Ver en Google Maps
          </Button>

          {place.safetyLevel && (
            <div className="mb-4">
              <SafetyBadge safetyLevel={place.safetyLevel} />
            </div>
          )}

          {place.stats?.avgRating && (
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-lg">
                {place.stats.avgRating.toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                ({place.stats.totalReviews} reseñas)
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {place.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>

          {place.contact && (
            <div className="space-y-2">
              {place.contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${place.contact.phone}`} className="text-primary hover:underline">
                    {place.contact.phone}
                  </a>
                </div>
              )}
              {place.contact.whatsapp && (
                <div className="flex items-center gap-2">
                  <span>📱</span>
                  <a
                    href={`https://wa.me/${place.contact.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    WhatsApp
                  </a>
                </div>
              )}
              {place.contact.instagram && (
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  <a
                    href={`https://instagram.com/${place.contact.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {place.contact.instagram}
                  </a>
                </div>
              )}
              {place.contact.url && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <a
                    href={place.contact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Sitio web
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="reviews" className="mt-8">
        <TabsList>
          <TabsTrigger value="reviews">Reseñas ({reviews.length})</TabsTrigger>
          <TabsTrigger value="write">Escribir reseña</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="mt-4">
          {reviews.length > 0 && (
            <div className="flex gap-2 mb-4">
              <Button
                variant={reviewSort === "recent" ? "default" : "outline"}
                size="sm"
                onClick={() => setReviewSort("recent")}
              >
                Más recientes
              </Button>
              <Button
                variant={reviewSort === "rating" ? "default" : "outline"}
                size="sm"
                onClick={() => setReviewSort("rating")}
              >
                Mejor valoradas
              </Button>
            </div>
          )}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay reseñas aún. Sé el primero en reseñar este lugar.
                </CardContent>
              </Card>
            ) : (
              sortedReviews.map((review: any) => (
                <Card key={review._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {review.userId?.image ? (
                          <Image
                            src={review.userId.image}
                            alt={review.userId?.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-sm">
                            {review.userId?.name?.[0] || "U"}
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">
                            {review.userId?.name || "Usuario"}
                          </CardTitle>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-2">{review.comment}</p>
                    <div className="flex gap-2">
                      {review.safeFeeling && (
                        <Badge variant="default">Me sentí seguro</Badge>
                      )}
                      {review.separateKitchen === "yes" && (
                        <Badge variant="secondary">Cocina separada</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="write" className="mt-4">
          <ReviewForm placeId={params.id as string} onSuccess={fetchReviews} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
