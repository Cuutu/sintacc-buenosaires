"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReviewForm } from "@/components/review-form"
import { ContaminationReportForm } from "@/components/contamination-report-form"
import { ContaminationRiskBadge } from "@/components/contamination-risk-badge"
import { SafetyBadge } from "@/components/safety-badge"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { TagBadge } from "@/components/TagBadge"
import { FavoriteButton } from "@/components/favorite-button"
import { StickyActionBarMobile, PhotoStrip } from "@/components/lugar"
import { IPlace } from "@/models/Place"
import { IReview } from "@/models/Review"
import {
  Star,
  MapPin,
  Phone,
  Instagram,
  Globe,
  ExternalLink,
  Share2,
  MapPinned,
  Clock,
  Package,
  AlertTriangle,
} from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { fetchApi } from "@/lib/fetchApi"
import { TYPES } from "@/lib/constants"
import { isOpenNow } from "@/lib/opening-hours"

export default function LugarPage() {
  const params = useParams()
  const [place, setPlace] = useState<IPlace & { stats?: any } | null>(null)
  const [reviews, setReviews] = useState<IReview[]>([])
  const [contaminationReports, setContaminationReports] = useState<Array<{
    _id: string
    comment: string
    createdAt: string
    userId?: { name?: string }
  }>>([])
  const [reviewSort, setReviewSort] = useState<"recent" | "rating">("recent")
  const [loading, setLoading] = useState(true)
  const [reviewsPagination, setReviewsPagination] = useState<{
    page: number
    pages: number
    total: number
  } | null>(null)
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false)

  useEffect(() => {
    if (params.id) {
      fetchPlace()
      fetchReviews()
      fetchContaminationReports()
    }
  }, [params.id])

  const fetchPlace = async () => {
    try {
      const data = await fetchApi<IPlace & { stats?: unknown }>(
        `/api/places/${params.id}`
      )
      setPlace(data)
    } catch (error: any) {
      setPlace(null)
      if (error?.status !== 404) {
        toast.error(error?.message || "Error al cargar el lugar")
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) setLoadingMoreReviews(true)
      const data = await fetchApi<{
        reviews: IReview[]
        pagination: { page: number; pages: number; total: number }
      }>(`/api/reviews?placeId=${params.id}&page=${page}&limit=20`)
      const newReviews = data.reviews || []
      setReviews((prev) => (append ? [...prev, ...newReviews] : newReviews))
      setReviewsPagination(
        data.pagination
          ? {
              page: data.pagination.page,
              pages: data.pagination.pages,
              total: data.pagination.total,
            }
          : null
      )
    } catch (error: any) {
      if (!append) toast.error(error?.message || "Error al cargar reseñas")
    } finally {
      if (append) setLoadingMoreReviews(false)
    }
  }

  const fetchContaminationReports = async () => {
    try {
      const data = await fetchApi<{
        reports: Array<{
          _id: string
          comment: string
          createdAt: string
          userId?: { name?: string }
        }>
      }>(
        `/api/contamination-reports?placeId=${params.id}`
      )
      setContaminationReports(data.reports || [])
    } catch {
      // Silencioso: no es crítico para la vista principal
    }
  }

  const sortedReviews = [...reviews].sort((a, b) => {
    if ((a as any).pinned && !(b as any).pinned) return -1
    if (!(a as any).pinned && (b as any).pinned) return 1
    if (reviewSort === "rating") return (b as any).rating - (a as any).rating
    return new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime()
  })

  const openInMaps = () => {
    if (!place) return
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`
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
      <div className="container mx-auto px-4 py-6 pb-24 md:pb-8">
        <div className="animate-pulse space-y-4">
          <div className="aspect-[4/3] bg-muted rounded-2xl" />
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

  const displayTypes = place.types?.length ? place.types : [place.type]
  const typeConfig = TYPES.find((t) => t.value === place.type)

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-8 min-h-screen">
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Fotos: strip horizontal mobile */}
        <div className="space-y-4">
          <PhotoStrip
            photos={place.photos}
            name={place.name}
            type={place.type}
            types={place.types}
          />
        </div>

        {/* Info */}
        <div>
          <div className="flex flex-col gap-4 mb-4">
            <h1 className="text-2xl md:text-3xl font-bold">{place.name}</h1>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="[&>*]:min-h-[44px] [&>*]:text-base">
                <SafetyBadge safetyLevel={inferSafetyLevel(place)} />
              </div>
              <div className="hidden md:flex gap-2 [&>button]:min-h-[44px] [&>button]:min-w-[44px]">
                <FavoriteButton placeId={place._id.toString()} />
                <Button variant="outline" size="icon" onClick={shareLink} title="Copiar link">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={shareWhatsApp} title="Compartir en WhatsApp">
                  <span className="text-lg">📱</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 text-base">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">
              {place.address}, {place.neighborhood}
            </span>
          </div>

          {place.openingHours && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
              <span>{place.openingHours}</span>
              {(() => {
                const open = isOpenNow(place.openingHours)
                if (open === true) return <Badge className="bg-primary/20 text-primary min-h-[44px]">Abierto</Badge>
                if (open === false) return <Badge variant="secondary" className="min-h-[44px]">Cerrado</Badge>
                return null
              })()}
            </div>
          )}

          {place.delivery?.available && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="font-medium">Delivery</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {place.delivery.rappi && (
                  <Button variant="outline" size="sm" asChild className="min-h-[44px]">
                    <a href={place.delivery.rappi} target="_blank" rel="noopener noreferrer">
                      Rappi
                    </a>
                  </Button>
                )}
                {place.delivery.pedidosya && (
                  <Button variant="outline" size="sm" asChild className="min-h-[44px]">
                    <a href={place.delivery.pedidosya} target="_blank" rel="noopener noreferrer">
                      PedidosYa
                    </a>
                  </Button>
                )}
                {place.delivery.other && (
                  <Button variant="outline" size="sm" asChild className="min-h-[44px]">
                    <a href={place.delivery.other} target="_blank" rel="noopener noreferrer">
                      Otro
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          <Button
            variant="outline"
            className="mb-4 min-h-[48px] w-full md:w-auto"
            onClick={openInMaps}
          >
            <MapPinned className="h-4 w-4 mr-2" />
            Ver en Google Maps
          </Button>

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

          {place.stats?.contaminationReportsCount > 0 && (
            <div className="mb-4">
              <ContaminationRiskBadge
                count={place.stats.contaminationReportsCount}
                variant="banner"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center mb-4">
            <ContaminationReportForm
              placeId={params.id as string}
              onSuccess={() => {
                fetchPlace()
                fetchContaminationReports()
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {displayTypes.map((t) => (
              <Badge key={t} variant="secondary" className="bg-primary/10 text-primary min-h-[44px] px-4">
                {TYPES.find((c) => c.value === t)?.emoji} {TYPES.find((c) => c.value === t)?.label || t}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {place.tags?.map((tag) => (
              <TagBadge key={tag} tag={tag} />
            ))}
          </div>

          {place.contact && (
            <div className="space-y-2">
              {place.contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <a
                    href={`tel:${place.contact.phone}`}
                    className="text-primary hover:underline min-h-[44px] flex items-center"
                  >
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
                    className="text-primary hover:underline min-h-[44px] flex items-center"
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
        <TabsList className="w-full flex min-h-[48px] mb-4">
          <TabsTrigger value="reviews" className="flex-1 min-h-[44px] text-base">
            Reseñas ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="write" className="flex-1 min-h-[44px] text-base">
            Escribir reseña
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reviews" className="mt-4">
          {contaminationReports.length > 0 && (
            <div className="mb-6 space-y-3">
              <h3 className="font-semibold text-amber-600 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Reportes de contaminación ({contaminationReports.length})
              </h3>
              <div className="space-y-3">
                {contaminationReports.map((report: any) => (
                  <Card key={report._id} className="border-amber-500/30 bg-amber-500/5">
                    <CardContent className="pt-4">
                      <p className="text-sm">{report.comment}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(report.createdAt).toLocaleDateString("es-AR")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {reviews.length > 0 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button
                variant={reviewSort === "recent" ? "default" : "outline"}
                size="sm"
                className="min-h-[44px]"
                onClick={() => setReviewSort("recent")}
              >
                Más recientes
              </Button>
              <Button
                variant={reviewSort === "rating" ? "default" : "outline"}
                size="sm"
                className="min-h-[44px]"
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
              <>
              {sortedReviews.map((review: any) => (
                <Card key={review._id} className={review.pinned ? "border-primary/50" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {review.userId?.image ? (
                          <Image
                            src={review.userId.image}
                            alt={review.userId?.name}
                            width={40}
                            height={40}
                            className="rounded-full"
                            unoptimized
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-base shrink-0">
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
                                className={`h-5 w-5 ${
                                  i < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {review.pinned && (
                          <Badge variant="default" className="text-xs">Fijado</Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString("es-AR")}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-2 text-base">{review.comment}</p>
                    {review.evidencePhotos && review.evidencePhotos.length > 0 && (
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {review.evidencePhotos.map((url: string) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0 hover:opacity-90"
                          >
                            <Image
                              src={url}
                              alt="Foto de la reseña"
                              width={80}
                              height={80}
                              className="object-cover w-full h-full"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {review.safeFeeling && (
                        <Badge variant="default" className="min-h-[44px]">Me sentí seguro</Badge>
                      )}
                      {review.separateKitchen === "yes" && (
                        <Badge variant="secondary" className="min-h-[44px]">Cocina separada</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {reviewsPagination &&
                reviewsPagination.page < reviewsPagination.pages && (
                  <div className="pt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => fetchReviews(reviewsPagination.page + 1, true)}
                      disabled={loadingMoreReviews}
                    >
                      {loadingMoreReviews ? "Cargando..." : "Ver más reseñas"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
        <TabsContent value="write" className="mt-4">
          <ReviewForm placeId={params.id as string} onSuccess={fetchReviews} />
        </TabsContent>
      </Tabs>

      <StickyActionBarMobile place={place} />
    </div>
  )
}
