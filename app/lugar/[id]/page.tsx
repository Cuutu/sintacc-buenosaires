"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Star } from "lucide-react"
import { toast } from "sonner"
import { fetchApi } from "@/lib/fetchApi"
import { TYPES } from "@/lib/constants"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { getPlacePath } from "@/lib/place-url"
import { trackEvent } from "@/lib/analytics"
import { IPlace } from "@/models/Place"
import { IReview } from "@/models/Review"
import { PlaceHero } from "@/components/lugar/PlaceHero"
import { PlaceTrustCard } from "@/components/lugar/PlaceTrustCard"
import { PlacePrimaryActions } from "@/components/lugar/PlacePrimaryActions"
import { PlaceInfoCard } from "@/components/lugar/PlaceInfoCard"
import { PlaceReportCard } from "@/components/lugar/PlaceReportCard"
import { PlaceCommunityReviews } from "@/components/lugar/PlaceCommunityReviews"
import { PlaceGoogleSection } from "@/components/lugar/PlaceGoogleSection"
import { PlaceNearbyRail } from "@/components/lugar/PlaceNearbyRail"
import { PlaceDesktopAside } from "@/components/lugar/PlaceDesktopAside"

function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value)
}

type ReviewItem = IReview & {
  userId?: { name?: string; image?: string }
  pinned?: boolean
  evidencePhotos?: string[]
  adminReply?: string
  adminReplyAt?: string | Date
  adminReplyBy?: string
}

export default function LugarPage() {
  const params = useParams()
  const router = useRouter()
  const routePlaceParam = params.id as string | undefined
  const { data: session } = useSession()
  const [place, setPlace] = useState<(IPlace & { stats?: any }) | null>(null)
  const [reviews, setReviews] = useState<ReviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewsPagination, setReviewsPagination] = useState<{
    page: number
    pages: number
    total: number
  } | null>(null)
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false)
  const [nearbyPlaces, setNearbyPlaces] = useState<
    Array<IPlace & { stats?: { avgRating?: number; totalReviews?: number }; distance?: number }>
  >([])
  const [reviewsExpanded, setReviewsExpanded] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const INITIAL_REVIEWS = 4
  const placeId = place?._id.toString()

  useEffect(() => {
    if (routePlaceParam) fetchPlace()
  }, [routePlaceParam])

  useEffect(() => {
    if (!placeId) return
    fetchReviews()
  }, [placeId])

  useEffect(() => {
    if (!placeId) return
    trackEvent("place_view", { placeId })
  }, [placeId])

  useEffect(() => {
    const hasLocation = place?.location?.lat != null && place?.location?.lng != null
    const hasNeighborhood = Boolean(place?.neighborhood)
    if (place && (hasLocation || hasNeighborhood)) fetchNearby()
  }, [place?._id, place?.location?.lat, place?.location?.lng, place?.neighborhood])

  const fetchPlace = async () => {
    if (!routePlaceParam) return
    try {
      const data = await fetchApi<IPlace & { stats?: unknown }>(`/api/places/${routePlaceParam}`)
      setPlace(data)
      if (data.slug && isObjectId(routePlaceParam)) {
        router.replace(getPlacePath(data))
      }
    } catch (error: any) {
      setPlace(null)
      if (error?.status !== 404) toast.error(error?.message || "Error al cargar el lugar")
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async (page = 1, append = false) => {
    if (!placeId) return
    try {
      if (append) setLoadingMoreReviews(true)
      const data = await fetchApi<{
        reviews: ReviewItem[]
        pagination: { page: number; pages: number; total: number }
      }>(`/api/reviews?placeId=${placeId}&page=${page}&limit=20`)
      const newReviews = data.reviews || []
      setReviews((prev) => (append ? [...prev, ...newReviews] : newReviews))
      setReviewsPagination(
        data.pagination
          ? { page: data.pagination.page, pages: data.pagination.pages, total: data.pagination.total }
          : null
      )
    } catch (error: any) {
      if (!append) toast.error(error?.message || "Error al cargar reseñas")
    } finally {
      if (append) setLoadingMoreReviews(false)
    }
  }

  const fetchNearby = async () => {
    if (!place) return
    try {
      let places: Array<IPlace & { distance?: number; stats?: any }> = []
      if (place.location?.lat != null && place.location?.lng != null) {
        const nearData = await fetchApi<{ places: Array<IPlace & { distance?: number }> }>(
          `/api/places/near?lat=${place.location.lat}&lng=${place.location.lng}&radius=2000`
        )
        places = nearData.places || []
      }
      if (places.length === 0 && place.neighborhood) {
        const listData = await fetchApi<{ places: Array<IPlace & { stats?: any }> }>(
          `/api/places?neighborhood=${encodeURIComponent(place.neighborhood)}&limit=7`
        )
        places = listData.places || []
      }
      setNearbyPlaces(places.filter((p: any) => p._id?.toString() !== placeId).slice(0, 5))
    } catch {
      setNearbyPlaces([])
    }
  }

  const sortedReviews = [...reviews].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const hasMoreReviews = reviewsExpanded
    ? !!(reviewsPagination && reviewsPagination.page < reviewsPagination.pages)
    : sortedReviews.length > INITIAL_REVIEWS

  const displayedReviews = reviewsExpanded
    ? sortedReviews
    : sortedReviews.slice(0, INITIAL_REVIEWS)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#F8F5EF]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C85A2E] border-t-transparent" />
      </div>
    )
  }

  if (!place) {
    return (
      <div className="bg-[#F8F5EF] px-5 py-20 text-center">
        <p className="mb-2 text-[32px] font-bold leading-tight text-[#1F4D35]">Lugar no encontrado</p>
        <p className="mb-6 text-base text-[#5F6B63]">El lugar que buscás no existe o fue eliminado.</p>
        <Button asChild>
          <Link href="/mapa">Ir al mapa</Link>
        </Button>
      </div>
    )
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${getPlacePath(place)}`
      : `https://www.celimap.com.ar${getPlacePath(place)}`
  const reportCount = place.stats?.contaminationReportsCount ?? 0
  const effectiveSafety = inferSafetyLevel(place)
  const isDedicated = effectiveSafety === "dedicated_gf"
  const addressText = place.addressText || place.address || ""
  const typeConfig = TYPES.find((t) => t.value === (place.types?.[0] ?? place.type))
  const totalReviews = place.stats?.totalReviews ?? 0
  const avgRating = place.stats?.avgRating ?? 0
  const categoryLine = [typeConfig?.label, place.neighborhood].filter(Boolean).join(" · ")

  const onReportSuccess = () => {
    fetchPlace()
  }

  return (
    <div className="min-h-full bg-[#F8F5EF] pb-8 lg:pb-16">
      <div className="lg:mx-auto lg:grid lg:max-w-[1100px] lg:grid-cols-[minmax(0,760px)_minmax(280px,320px)] lg:items-start lg:gap-10 lg:px-8 lg:pt-8">
        <div className="min-w-0">
          <PlaceHero
            photos={place.photos}
            photoSource={place.photoSource}
            name={place.name}
            placeId={placeId!}
            shareUrl={shareUrl}
            safetyLevel={effectiveSafety}
          />

          <div className="space-y-8 px-5 pt-6 lg:px-0">
            <header>
              <h1 className="text-[32px] font-bold leading-tight tracking-tight text-[#1F4D35]">
                {place.name}
              </h1>
              {categoryLine ? (
                <p className="mt-2 text-base text-[#5F6B63]">{categoryLine}</p>
              ) : null}
              {totalReviews > 0 ? (
                <p className="mt-2 flex items-center gap-1.5 text-base text-[#1F4D35]">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold">{avgRating.toFixed(1)}</span>
                  <span className="text-[#5F6B63]">
                    ({totalReviews} {totalReviews === 1 ? "reseña" : "reseñas"})
                  </span>
                </p>
              ) : (
                <p className="mt-2 text-base text-[#5F6B63]">Todavía no hay reseñas</p>
              )}
            </header>

            <PlaceTrustCard reportCount={reportCount} isDedicated={isDedicated} />

            <div className="lg:hidden">
              <PlacePrimaryActions
                mapsUrl={mapsUrl}
                placeId={placeId!}
                name={place.name}
                shareUrl={shareUrl}
              />
            </div>

            <PlaceInfoCard
              address={addressText}
              mapsUrl={mapsUrl}
              openingHours={place.openingHours}
              phone={place.contact?.phone}
              website={place.contact?.url}
            />

            <div className="lg:hidden">
              <PlaceReportCard placeId={placeId!} onSuccess={onReportSuccess} />
            </div>

            <PlaceCommunityReviews
              reviews={reviews}
              displayedReviews={displayedReviews}
              totalReviews={totalReviews}
              avgRating={avgRating}
              showReviewForm={showReviewForm}
              onShowReviewForm={setShowReviewForm}
              onReviewSuccess={() => fetchReviews()}
              placeId={placeId!}
              isAdmin={session?.user?.role === "admin"}
              hasMoreReviews={hasMoreReviews}
              reviewsExpanded={reviewsExpanded}
              onExpandReviews={() => setReviewsExpanded(true)}
              onLoadMore={() => fetchReviews((reviewsPagination?.page ?? 1) + 1, true)}
              loadingMore={loadingMoreReviews}
            />

            <PlaceGoogleSection snapshot={place.googleSnapshot} />

            <PlaceNearbyRail places={nearbyPlaces} />
          </div>
        </div>

        <PlaceDesktopAside
          mapsUrl={mapsUrl}
          placeId={placeId!}
          name={place.name}
          shareUrl={shareUrl}
          address={addressText}
          openingHours={place.openingHours}
          phone={place.contact?.phone}
          onReportSuccess={onReportSuccess}
        />
      </div>
    </div>
  )
}
