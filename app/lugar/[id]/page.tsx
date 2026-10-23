import { notFound, permanentRedirect } from "next/navigation"
import { Star } from "lucide-react"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { getPlacePath } from "@/lib/place-url"
import { getBaseUrl } from "@/lib/base-url"
import { getApprovedPlaceByRouteParam } from "@/lib/place-route"
import { getPlaceLiveStats } from "@/lib/place-stats"
import { getNearbyPlacesForPlace } from "@/lib/place-nearby"
import { formatFullPlaceAddress } from "@/lib/place-location-display"
import { getPublicWebsite } from "@/lib/place-website"
import { getPlaceReviewLines } from "@/lib/place-review-display"
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
import { PlaceOpenNowLine } from "@/components/lugar/PlaceOpenNowLine"
import { TrackPageView } from "@/components/analytics/TrackPageView"
import { TrackPlaceDwell } from "@/components/analytics/TrackPlaceDwell"

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

  // ObjectId o slug viejo (renombre) → 301 al slug actual.
  if (place.slug && place.slug !== id) {
    permanentRedirect(getPlacePath(place))
  }

  const placeId = place._id.toString()
  const [liveStats, nearbyPlaces] = await Promise.all([
    getPlaceLiveStats(placeId),
    getNearbyPlacesForPlace(place),
  ])

  const lat = place.location?.lat
  const lng = place.location?.lng
  const mapsQuery =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? `${lat},${lng}`
      : place.address || place.name
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
  const shareUrl = `${getBaseUrl()}${getPlacePath(place)}`
  const reportCount = liveStats.contaminationReportsCount
  const effectiveSafety = inferSafetyLevel(place)
  const isDedicated = effectiveSafety === "dedicated_gf"
  const addressText = formatFullPlaceAddress(place)
  const categoryLine = placeCategoryLine(place)
  const reviewLines = getPlaceReviewLines(
    {
      stats: { avgRating: liveStats.avgRating, totalReviews: liveStats.totalReviews },
      googleSnapshot: place.googleSnapshot,
    },
    // "Todavía no hay reseñas de la comunidad" ya lo dice la sección de reseñas.
    { emptyCommunity: "never" }
  )

  const placeProperties = {
    placeId,
    city: place.locality || place.neighborhood || "",
    province: place.province || "",
    category: place.type,
  }

  return (
    <div className="min-h-full bg-[#F8F5EF] pb-8 lg:pb-16">
      <TrackPageView event="place_view" properties={placeProperties} />
      <TrackPlaceDwell placeId={placeId} properties={placeProperties} />
      {/* Compu: mismo ancho que la barra (max-w-5xl) y columna de acciones fija a la derecha. */}
      <div className="lg:mx-auto lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_316px] lg:items-start lg:gap-12 lg:px-5 lg:pt-10">
        <div className="min-w-0">
          <PlaceHero
            photos={place.photos}
            photoSource={place.photoSource}
            name={place.name}
            placeId={placeId}
            shareUrl={shareUrl}
            safetyLevel={effectiveSafety}
            type={place.type}
          />

          <div className="space-y-8 px-5 pt-6 lg:space-y-10 lg:px-0 lg:pt-8">
            <header>
              {/* En la compu el nombre va en Fraunces itálica, como en las tarjetas. */}
              <h1 className="font-serif text-[34px] font-medium italic leading-[1.05] tracking-[-0.02em] text-[#2D4A34] [text-wrap:balance] lg:text-[52px] lg:leading-[1.0]">
                {place.name}
              </h1>
              {categoryLine ? (
                <p className="mt-2 text-base text-[#5F6B63] lg:mt-3 lg:text-lg lg:font-bold lg:text-[#5E6A60]">
                  {categoryLine}
                </p>
              ) : null}
              {/* Celular: abierto/cerrado debajo del nombre (en la compu está en la columna derecha). */}
              <PlaceOpenNowLine hours={place.openingHours} className="lg:hidden" />
              {reviewLines.map((line) => (
                <p
                  key={line.kind}
                  className="mt-2 flex items-center gap-1.5 text-base text-[#1F4D35]"
                >
                  {line.hasScore ? (
                    <Star className="h-4 w-4 fill-[#C85A2E] text-[#C85A2E]" />
                  ) : null}
                  <span className={line.hasScore ? "font-semibold" : "text-[#5F6B63]"}>
                    {line.text}
                  </span>
                </p>
              ))}
            </header>

            <PlaceTrustCard reportCount={reportCount} isDedicated={isDedicated} />

            <div className="lg:hidden">
              {/* Guardar y Compartir ya están arriba, sobre la foto: acá solo "Cómo llegar". */}
              <PlacePrimaryActions
                mapsUrl={mapsUrl}
                placeId={placeId}
                name={place.name}
                shareUrl={shareUrl}
                showSaveShare={false}
              />
            </div>

            <PlaceInfoCard
              address={addressText}
              mapsUrl={mapsUrl}
              mapHref={`/mapa?place=${placeId}`}
              openingHours={place.openingHours}
              phone={place.contact?.phone}
              website={getPublicWebsite(place.contact?.url) ?? undefined}
            />

            <div className="lg:hidden">
              <PlaceReportCard placeId={placeId} />
            </div>

            <PlaceCommunityReviewsClient
              placeId={placeId}
              totalReviews={liveStats.totalReviews}
              avgRating={liveStats.avgRating}
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
          openingHours={place.openingHours}
        />
      </div>
    </div>
  )
}
