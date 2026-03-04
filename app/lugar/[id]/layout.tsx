import type { Metadata } from "next"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { Review } from "@/models/Review"
import mongoose from "mongoose"
import { PlaceJsonLd } from "@/components/seo/PlaceJsonLd"

const BASE_URL =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app"

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

type PlaceForMeta = {
  _id: string
  name: string
  neighborhood: string
  type: string
  address?: string
  location?: { lat: number; lng: number }
  photos?: string[]
  contact?: { url?: string; phone?: string }
  openingHours?: string
}

async function getPlaceWithStats(id: string) {
  await connectDB()
  const place = await Place.findById(id).lean()
  if (!place) return null
  const p = place as unknown as PlaceForMeta & { stats?: { avgRating: number; totalReviews: number } }
  const placeId = new mongoose.Types.ObjectId(id)
  const [reviewStats] = await Review.aggregate([
    { $match: { placeId, status: "visible" } },
    { $group: { _id: null, avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } },
  ])
  const stats = reviewStats
    ? {
        avgRating: Math.round((reviewStats.avgRating || 0) * 10) / 10,
        totalReviews: reviewStats.totalReviews,
      }
    : { avgRating: 0, totalReviews: 0 }
  return { ...p, stats }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return {
        title: "Lugar no encontrado | Celimap",
      }
    }
    const place = await getPlaceWithStats(id)
    if (!place) {
      return {
        title: "Lugar no encontrado | Celimap",
      }
    }
    const ogImage = place.photos?.[0] || `${BASE_URL}/CelimapLOGO.png`
    return {
      title: place.name,
      description: `${place.name} - ${place.neighborhood}. Lugar sin TACC en Argentina. Reseñas y datos de contacto.`,
      openGraph: {
        type: "website",
        title: `${place.name} | Celimap`,
        description: `${place.name} en ${place.neighborhood}. Lugar apto para celíacos en Argentina.`,
        images: [{ url: ogImage, width: 1200, height: 630, alt: place.name }],
      },
    }
  } catch {
    return {
      title: "Lugar | Celimap",
    }
  }
}

export default async function LugarLayout({ children, params }: Props) {
  const { id } = await params
  let placeJsonLd = null
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    try {
      const place = await getPlaceWithStats(id)
      if (place) {
        placeJsonLd = <PlaceJsonLd place={place} />
      }
    } catch {
      // Ignorar errores de schema
    }
  }
  return (
    <>
      {placeJsonLd}
      {children}
    </>
  )
}
