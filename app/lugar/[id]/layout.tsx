import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getBaseUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"
import { PlaceJsonLd } from "@/components/seo/PlaceJsonLd"
import { getApprovedPlaceByRouteParam } from "@/lib/place-route"
import { getPlaceLiveStats } from "@/lib/place-stats"

export const dynamicParams = true
export const revalidate = 3600

interface LugarLayoutProps {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

interface PlaceMetadataInput {
  _id: { toString(): string } | string
  slug?: string | null
  name: string
  neighborhood: string
  type: string
  address?: string
  province?: string
  locality?: string
  photos?: string[]
}

const TYPE_LABELS: Record<string, string> = {
  restaurant: "Restaurante",
  cafe: "Cafe",
  bakery: "Panaderia",
  store: "Tienda",
  icecream: "Heladeria",
  bar: "Bar",
  other: "Lugar",
}

function buildPlaceMetadata(place: PlaceMetadataInput): Metadata {
  const baseUrl = getBaseUrl()
  const canonical = `${baseUrl}${getPlacePath(place)}`
  const typeLabel = TYPE_LABELS[place.type] || "Lugar"
  const ogImage = place.photos?.[0] || `${baseUrl}/CelimapLOGO.png`
  const locationText = [place.address, place.neighborhood].filter(Boolean).join(", ")
  const description = `${place.name} - ${typeLabel} sin gluten en ${place.neighborhood}. ${
    locationText ? `${locationText}. ` : ""
  }Reseñas, datos de contacto y clasificación según la información cargada en CeliMap.`

  return {
    title: `${place.name}`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${place.name} | CeliMap`,
      description,
      url: canonical,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: place.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${place.name} | CeliMap`,
      description,
      images: [ogImage],
    },
  }
}

export async function generateMetadata({ params }: LugarLayoutProps): Promise<Metadata> {
  const { id } = await params
  const place = await getApprovedPlaceByRouteParam(id)
  if (!place) notFound()
  return buildPlaceMetadata(place)
}

export default async function LugarLayout({ params, children }: LugarLayoutProps) {
  const { id } = await params
  const place = await getApprovedPlaceByRouteParam(id)
  if (!place) notFound()

  const liveStats = await getPlaceLiveStats(place._id.toString())

  return (
    <>
      <PlaceJsonLd
        place={{
          _id: place._id.toString(),
          slug: place.slug,
          name: place.name,
          type: place.type,
          neighborhood: place.neighborhood,
          province: place.province,
          locality: place.locality,
          address: place.address,
          location: place.location,
          photos: place.photos,
          contact: place.contact,
          openingHours: place.openingHours,
          stats: {
            avgRating: liveStats.avgRating,
            totalReviews: liveStats.totalReviews,
          },
        }}
      />
      {children}
    </>
  )
}
