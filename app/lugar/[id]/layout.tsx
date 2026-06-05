import type { Metadata } from "next"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import mongoose from "mongoose"
import { getBaseUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"

export const dynamicParams = true
export const dynamic = "force-dynamic"

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
  }Resenas, datos de contacto y nivel de seguridad en Celimap.`

  return {
    title: `${place.name} | Celimap`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${place.name} | Celimap`,
      description,
      url: canonical,
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630, alt: place.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${place.name} | Celimap`,
      description,
      images: [ogImage],
    },
  }
}

export async function generateMetadata({ params }: LugarLayoutProps): Promise<Metadata> {
  try {
    const { id } = await params
    await connectDB()

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      const place = await Place.findOne({ slug: id, status: "approved" }).lean()
      if (!place) return { title: "Lugar no encontrado | Celimap", robots: { index: false } }
      return buildPlaceMetadata(place as PlaceMetadataInput)
    }

    const place = await Place.findOne({
      _id: new mongoose.Types.ObjectId(id),
      status: "approved",
    }).lean()

    if (!place) {
      console.error(`[lugar/[id]] No se encontro lugar con id: ${id}`)
      return { title: "Lugar no encontrado | Celimap", robots: { index: false } }
    }

    return buildPlaceMetadata(place as PlaceMetadataInput)
  } catch (error) {
    console.error("[lugar/[id]] Error en generateMetadata:", error)
    return { title: "Lugar | Celimap" }
  }
}

export default function LugarLayout({ children }: LugarLayoutProps) {
  return <>{children}</>
}
