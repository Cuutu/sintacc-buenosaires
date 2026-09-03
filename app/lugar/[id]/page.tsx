import { notFound, permanentRedirect } from "next/navigation"
import { Star } from "lucide-react"
import mongoose from "mongoose"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { getPlacePath } from "@/lib/place-url"
import { getBaseUrl } from "@/lib/base-url"
import { getApprovedPlaceByRouteParam } from "@/lib/place-route"
import { getPlaceLiveStats } from "@/lib/place-stats"
import { getNearbyPlacesForPlace } from "@/lib/place-nearby"
import { placeCategoryLine } from "@/lib/seo/place-metadata"
import { PlaceHero } from "@/components/lugar/PlaceHero"
import { PlaceTrustCard } from "@/components/lugar/PlaceTrustCard"
import { PlacePrimaryActions } from "@/components/lugar/PlacePrimaryActions"
import { PlaceInfoCard } from "@/components/lugar/PlaceInfoCard"
import { PlaceReportCard } from "@/components/lugar/PlaceReportCard"
import { PlaceCommunityReviewsClient } from "@/components/lugar/PlaceCommunityReviewsClient"
import { PlaceGoogleSection } from "@/components/lugar/PlaceGoogleSection"
import { PlaceNearbyRail } from "@/components/lugar/PlaceNearbyRail"
import { PlaceDesktopAside } from "@/components/lugar/PlaceDesktopAside"
import { TrackPageView } from "@/components/analytics/TrackPageView"

export const revalidate = 3600

/**
 * Array vacío a propósito: opta /lugar/[id] al bucket estático/ISR
 * (sin esto Next marca ƒ y ignora revalidate).
 * dynamicParams=true en layout → cada slug se genera on-demand en el
 * primer request y queda cacheada 1h. No listar ~1200 fichas acá:
 * prerender en CI haría el build lento y frágil.
 */
export async function generateStaticParams() {
  return []
}

interface LugarPageProps {
  params: Promise<{ id: string }>
}

export default async function LugarPage({ params }: LugarPageProps) {
  const { id } = await params
  const place = await getApprovedPlaceByRouteParam(id)
  if (!place) notFound()

  if (
    mongoose.Types.ObjectId.isValid(id) &&
    place.slug &&
    place.slug !== id
  ) {
    permanentRedirect(getPlacePath(place))
  }

  const placeId = place._id.toString()
  const [liveStats, nearbyPlaces] = await Promise.all([
    getPlaceLiveStats(placeId),
    getNearbyPlacesForPlace(place),
  ])

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address || place.name)}`
  const shareUrl = `${getBaseUrl()}${getPlacePath(place)}`
  const reportCount = liveStats.contaminationReportsCount
  const effectiveSafety = inferSafetyLevel(place)
  const isDedicated = effectiveSafety === "dedicated_gf"
  const addressText = place.addressText || place.address || ""
  const totalReviews = liveStats.totalReviews
  const avgRating = liveStats.avgRating
  const categoryLine = placeCategoryLine(place)

  return (
    <div className="min-h-full bg-[#F8F5EF] pb-8 lg:pb-16">
      <TrackPageView event="place_view" properties={{ placeId }} />
      <div className="lg:mx-auto lg:grid lg:max-w-[1100px] lg:grid-cols-[minmax(0,760px)_minmax(280px,320px)] lg:items-start lg:gap-10 lg:px-8 lg:pt-8">
        <div className="min-w-0">
          <PlaceHero
            photos={place.photos}
            photoSource={place.photoSource}
            name={place.name}
            placeId={placeId}
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
                placeId={placeId}
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
              <PlaceReportCard placeId={placeId} />
            </div>

            <PlaceCommunityReviewsClient
              placeId={placeId}
              totalReviews={totalReviews}
              avgRating={avgRating}
            />

            <PlaceGoogleSection snapshot={place.googleSnapshot} />

            <PlaceNearbyRail places={nearbyPlaces} />
          </div>
        </div>

        <PlaceDesktopAside
          mapsUrl={mapsUrl}
          placeId={placeId}
          name={place.name}
          shareUrl={shareUrl}
          address={addressText}
          openingHours={place.openingHours}
          phone={place.contact?.phone}
        />
      </div>
    </div>
  )
}
