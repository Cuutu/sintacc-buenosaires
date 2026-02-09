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
import { Star, MapPin, Phone, Instagram, Globe } from "lucide-react"
import Image from "next/image"

export default function LugarPage() {
  const params = useParams()
  const [place, setPlace] = useState<IPlace & { stats?: any } | null>(null)
  const [reviews, setReviews] = useState<IReview[]>([])
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  if (!place) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Lugar no encontrado</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Photos */}
        {place.photos && place.photos.length > 0 && (
          <div className="space-y-2">
            <div className="relative h-64 w-full rounded-lg overflow-hidden">
              <img
                src={place.photos[0]}
                alt={place.name}
                className="w-full h-full object-cover"
              />
            </div>
            {place.photos.length > 1 && (
              <div className="grid grid-cols-3 gap-2">
                {place.photos.slice(1, 4).map((photo, idx) => (
                  <div key={idx} className="relative h-24 w-full rounded overflow-hidden">
                    <img
                      src={photo}
                      alt={`${place.name} ${idx + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold">{place.name}</h1>
            <FavoriteButton placeId={place._id.toString()} />
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {place.address}, {place.neighborhood}
            </span>
          </div>

          {place.safetyLevel && (
            <div className="mb-4">
              <SafetyBadge safetyLevel={place.safetyLevel} />
            </div>
          )}

          {place.stats?.avgRating && (
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
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
                {tag}
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
                    className="text-primary hover:underline"
                  >
                    Sitio web
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
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No hay reseñas aún. Sé el primero en reseñar este lugar.
                </CardContent>
              </Card>
            ) : (
              reviews.map((review: any) => (
                <Card key={review._id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {review.userId?.name?.[0] || "U"}
                        </div>
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
                                    ? "fill-yellow-400 text-yellow-400"
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
