"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ReviewForm } from "@/components/review-form"
import { ContaminationReportForm } from "@/components/contamination-report-form"
import { TagBadge } from "@/components/TagBadge"
import { FavoriteButton } from "@/components/favorite-button"
import { StickyActionBarMobile, PhotoStrip } from "@/components/lugar"
import { IPlace } from "@/models/Place"
import { IReview } from "@/models/Review"
import {
  Star,
  MapPin,
  Instagram,
  Globe,
  ExternalLink,
  MapPinned,
  Clock,
  Package,
  AlertTriangle,
  CheckCircle2,
  Heart,
  MessageCircle,
  ChevronDown,
} from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { fetchApi } from "@/lib/fetchApi"
import { TYPES } from "@/lib/constants"
import { features } from "@/lib/features"
import { isOpenNow } from "@/lib/opening-hours"

export default function LugarPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
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
  const [nearbyPlaces, setNearbyPlaces] = useState<Array<IPlace & { stats?: { avgRating?: number; totalReviews?: number }; distance?: number }>>([])
  const [loadingNearby, setLoadingNearby] = useState(true)
  const [reviewsExpanded, setReviewsExpanded] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const INITIAL_REVIEWS = 4

  useEffect(() => {
    if (params.id) {
      fetchPlace()
      fetchReviews()
      fetchContaminationReports()
    }
  }, [params.id])

  useEffect(() => {
    const hasLocation = place?.location?.lat != null && place?.location?.lng != null
    const hasNeighborhood = Boolean(place?.neighborhood)
    if (place && (hasLocation || hasNeighborhood)) {
      fetchNearby()
    } else if (place !== undefined) {
      setLoadingNearby(false)
    }
  }, [place?._id, place?.location?.lat, place?.location?.lng, place?.neighborhood])

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

  const fetchNearby = async () => {
    if (!place) {
      setLoadingNearby(false)
      return
    }
    setLoadingNearby(true)
    try {
      // Buscar por geolocalización; si no hay resultados, usar lugares del mismo barrio
      let places: Array<IPlace & { distance?: number; stats?: any }> = []
      if (place.location?.lat != null && place.location?.lng != null) {
        const nearData = await fetchApi<{ places: Array<IPlace & { distance?: number }> }>(
          `/api/places/near?lat=${place.location.lat}&lng=${place.location.lng}&radius=2000`
        )
        places = nearData.places || []
      }
      // Fallback: si geo no devuelve resultados, usar lugares del mismo barrio
      if (places.length === 0 && place.neighborhood) {
        const listData = await fetchApi<{ places: Array<IPlace & { stats?: any }> }>(
          `/api/places?neighborhood=${encodeURIComponent(place.neighborhood)}&limit=7`
        )
        places = listData.places || []
      }
      const filtered = places
        .filter((p: any) => p._id?.toString() !== params.id)
        .slice(0, 6)
      setNearbyPlaces(filtered)
    } catch {
      setNearbyPlaces([])
    } finally {
      setLoadingNearby(false)
    }
  }

  const sortedReviews = [...reviews].sort((a, b) => {
    if ((a as any).pinned && !(b as any).pinned) return -1
    if (!(a as any).pinned && (b as any).pinned) return 1
    if (reviewSort === "rating") return (b as any).rating - (a as any).rating
    return new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime()
  })

  const mapsUrl = place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}` : ""
  const reportCount = place?.stats?.contaminationReportsCount ?? 0
  const isVerified = reportCount === 0

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
  const addressText = [place.address, place.neighborhood].filter(Boolean).join(", ")
  const visibleReviews = reviewsExpanded ? sortedReviews : sortedReviews.slice(0, INITIAL_REVIEWS)
  const hasMoreReviews = sortedReviews.length > INITIAL_REVIEWS

  const SafetyCard = () => {
    if (isVerified) {
      return (
        <div className="w-full rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/90 via-emerald-900/70 to-emerald-950/90 p-6 md:p-8">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex h-14 w-14 md:h-16 md:w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500/30">
              <CheckCircle2 className="h-8 w-8 md:h-10 md:w-10 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg md:text-xl font-bold tracking-tight text-white">VERIFICADO SIN TACC</p>
              <p className="text-sm md:text-base text-emerald-200/90 mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                Sin reportes de contaminación
              </p>
            </div>
          </div>
        </div>
      )
    }
    if (reportCount > 0) {
      return (
        <div className="w-full rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/90 via-amber-900/70 to-amber-950/90 p-6 md:p-8">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex h-14 w-14 md:h-16 md:w-16 shrink-0 items-center justify-center rounded-full bg-amber-500/30">
              <AlertTriangle className="h-8 w-8 md:h-10 md:w-10 text-amber-400" />
            </div>
            <div>
              <p className="text-lg md:text-xl font-bold tracking-tight text-amber-100">REPORTES DE CONTAMINACIÓN</p>
              <p className="text-sm md:text-base text-amber-200/90 mt-0.5">{reportCount} {reportCount === 1 ? "reporte" : "reportes"} de usuarios</p>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-8 min-h-screen">
      {/* Hero: imagen izq 40%, info der 60% - orden: Nombre, Rating, Safety, Dirección, Botones, Links */}
      <div className="grid grid-cols-1 md:grid-cols-[40%_60%] gap-6 md:gap-8 mb-10">
        {/* LEFT (40%): Imagen */}
        <div className="order-1">
          <PhotoStrip photos={place.photos} name={place.name} type={place.type} types={place.types} />
        </div>

        {/* RIGHT (60%): Info */}
        <div className="order-2 space-y-5">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">{place.name}</h1>

          {place.stats?.avgRating != null && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i <= Math.round(place.stats!.avgRating!) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50"}`}
                  />
                ))}
              </div>
              <span className="font-semibold">{place.stats.avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{place.stats.totalReviews} {place.stats.totalReviews === 1 ? "reseña" : "reseñas"}</span>
            </div>
          )}

          <SafetyCard />

          <div className="flex items-start gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-foreground">{addressText}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg" className="min-h-[48px]">
              <Link href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPinned className="h-4 w-4 mr-2" />
                Cómo llegar
              </Link>
            </Button>
            {session && features.favorites ? (
              <FavoriteButton placeId={place._id.toString()} showLabel />
            ) : (
              <Button variant="outline" size="lg" className="min-h-[48px]" onClick={() => !session && router.push("/login")}>
                <Heart className="h-5 w-5 mr-2" />
                Guardar
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <ContaminationReportForm
              placeId={params.id as string}
              onSuccess={() => { fetchPlace(); fetchContaminationReports() }}
              trigger={
                <button type="button" className="inline-flex items-center gap-2 text-sm text-primary hover:underline text-left">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Reportar contaminación
                </button>
              }
            />
            {place.contact?.url && (
              <a href={place.contact.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <Globe className="h-4 w-4 shrink-0" />
                Sitio web
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {place.contact?.instagram && (
              <a href={`https://instagram.com/${place.contact.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <Instagram className="h-4 w-4 shrink-0" />
                Instagram @{place.contact.instagram.replace("@", "")}
              </a>
            )}
          </div>

          {place.openingHours && (
            <div className="flex items-center gap-2 flex-wrap">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
              <span>{place.openingHours}</span>
              {(() => {
                const open = isOpenNow(place.openingHours)
                if (open === true) return <Badge className="bg-primary/20 text-primary">Abierto</Badge>
                if (open === false) return <Badge variant="secondary">Cerrado</Badge>
                return null
              })()}
            </div>
          )}

          {place.delivery?.available && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="font-medium">Delivery</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {place.delivery.rappi && <Button variant="outline" size="sm" asChild><a href={place.delivery.rappi} target="_blank" rel="noopener noreferrer">Rappi</a></Button>}
                {place.delivery.pedidosya && <Button variant="outline" size="sm" asChild><a href={place.delivery.pedidosya} target="_blank" rel="noopener noreferrer">PedidosYa</a></Button>}
                {place.delivery.other && <Button variant="outline" size="sm" asChild><a href={place.delivery.other} target="_blank" rel="noopener noreferrer">Otro</a></Button>}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {displayTypes.map((t) => (
              <Badge key={t} variant="secondary" className="bg-primary/10 text-primary px-4">
                {TYPES.find((c) => c.value === t)?.emoji} {TYPES.find((c) => c.value === t)?.label || t}
              </Badge>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {place.tags?.map((tag) => <TagBadge key={tag} tag={tag} />)}
          </div>
        </div>
      </div>

      {/* Reportes de contaminación */}
      {contaminationReports.length > 0 && (
        <section className="mb-10">
          <h3 className="font-semibold text-amber-600 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4" />
            Reportes de contaminación ({contaminationReports.length})
          </h3>
          <div className="space-y-3">
            {contaminationReports.map((report: any) => (
              <Card key={report._id} className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="pt-4">
                  <p className="text-sm">{report.comment}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(report.createdAt).toLocaleDateString("es-AR")}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Reseñas */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold">💬 Reseñas de la comunidad</h2>
          <Button variant="outline" size="sm" onClick={() => setShowReviewForm(true)}>
            Escribir reseña
          </Button>
        </div>

        {reviews.length === 0 && !showReviewForm && (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="py-12 text-center">
              <div className="flex flex-col items-center gap-3 mb-6">
                <MessageCircle className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium mb-1">Todavía no hay reseñas. Ayudá a otros celíacos:</p>
                  <p className="text-muted-foreground">Contanos si fue seguro, como fue la atención</p>
                </div>
              </div>
              <Button size="lg" onClick={() => setShowReviewForm(true)}>
                Escribir primera reseña
              </Button>
            </CardContent>
          </Card>
        )}

        {reviews.length > 0 && (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button variant={reviewSort === "recent" ? "default" : "outline"} size="sm" onClick={() => setReviewSort("recent")}>Más recientes</Button>
              <Button variant={reviewSort === "rating" ? "default" : "outline"} size="sm" onClick={() => setReviewSort("rating")}>Mejor valoradas</Button>
            </div>
            <div className="space-y-4">
              {visibleReviews.map((review: any) => (
                <Card key={review._id} className={review.pinned ? "border-primary/50" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {review.userId?.image ? (
                          <Image src={review.userId.image} alt={review.userId?.name} width={40} height={40} className="rounded-full" unoptimized />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-base shrink-0">
                            {review.userId?.name?.[0] || "U"}
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">{review.userId?.name || "Usuario"}</CardTitle>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-5 w-5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {review.pinned && <Badge variant="default" className="text-xs">Fijado</Badge>}
                        <span className="text-sm text-muted-foreground">{new Date(review.createdAt).toLocaleDateString("es-AR")}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-2 text-base">{review.comment}</p>
                    {review.evidencePhotos?.length > 0 && (
                      <div className="flex gap-2 mb-3 flex-wrap">
                        {review.evidencePhotos.map((url: string) => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block w-20 h-20 rounded-lg overflow-hidden border border-border shrink-0 hover:opacity-90">
                            <Image src={url} alt="Foto de la reseña" width={80} height={80} className="object-cover w-full h-full" />
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {review.safeFeeling && <Badge variant="default">Me sentí seguro</Badge>}
                      {review.separateKitchen === "yes" && <Badge variant="secondary">Cocina separada</Badge>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {hasMoreReviews && !reviewsExpanded && (
              <div className="pt-4 flex justify-center">
                <Button variant="outline" onClick={() => setReviewsExpanded(true)}>Ver más reseñas</Button>
              </div>
            )}
            {reviewsExpanded && reviewsPagination && reviewsPagination.page < reviewsPagination.pages && (
              <div className="pt-4 flex justify-center">
                <Button variant="outline" onClick={() => fetchReviews(reviewsPagination!.page + 1, true)} disabled={loadingMoreReviews}>
                  {loadingMoreReviews ? "Cargando..." : "Ver más reseñas"}
                </Button>
              </div>
            )}
          </>
        )}

        {reviews.length > 0 && !showReviewForm && (
          <div className="pt-4">
            <Button variant="outline" onClick={() => setShowReviewForm(true)}>Escribir reseña</Button>
          </div>
        )}

        {showReviewForm && (
          <div id="review-form" className="mt-6">
            <div className="mb-3">
              <Button variant="ghost" size="sm" onClick={() => setShowReviewForm(false)}>
                ← Volver
              </Button>
            </div>
            <ReviewForm
              placeId={params.id as string}
              onSuccess={() => {
                fetchReviews()
                setShowReviewForm(false)
              }}
            />
          </div>
        )}
      </section>

      {/* Cerca de este lugar */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4 flex items-center justify-between">
          Cerca de este lugar
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </h2>
        {nearbyPlaces.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyPlaces.map((p: any) => (
              <Link key={p._id} href={`/lugar/${p._id}`}>
                <Card className="h-full overflow-hidden hover:border-primary/50 transition-colors">
                  <div className="relative h-32">
                    {p.photos?.[0] ? (
                      <Image src={p.photos[0]} alt={p.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <span className="text-3xl">{TYPES.find((t) => t.value === p.type)?.emoji || "📍"}</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2">
                      {(p.tags?.includes("100_gf") || p.tags?.includes("certificado_sin_tacc")) && (
                        <Badge className="bg-primary/90 text-primary-foreground text-xs">100% sin TACC</Badge>
                      )}
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-2">{p.name}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {p.stats?.avgRating != null && (
                        <>
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span>{p.stats.avgRating.toFixed(1)}</span>
                        </>
                      )}
                      {p.distance != null && (
                        <span>· {(p.distance / 1000).toFixed(1)} km</span>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : loadingNearby ? (
          <p className="text-muted-foreground text-sm py-4">Cargando lugares cercanos...</p>
        ) : (
          <p className="text-muted-foreground text-sm py-4">No se encontraron lugares cercanos.</p>
        )}
      </section>

      <StickyActionBarMobile place={place} />
    </div>
  )
}
