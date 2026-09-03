import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PlaceJsonLd } from "@/components/seo/PlaceJsonLd"
import { getApprovedPlaceByRouteParam } from "@/lib/place-route"
import { getPlaceLiveStats } from "@/lib/place-stats"
import { missingPlaceMetadata } from "@/lib/seo/missing-place-metadata"
import { buildPlaceMetadata } from "@/lib/seo/place-metadata"

export const dynamicParams = true
export const revalidate = 3600

interface LugarLayoutProps {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: LugarLayoutProps): Promise<Metadata> {
  const { id } = await params
  const place = await getApprovedPlaceByRouteParam(id)
  if (!place) return missingPlaceMetadata
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
