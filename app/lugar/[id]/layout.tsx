import type { Metadata } from "next"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import mongoose from "mongoose"

export const dynamicParams = true
export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return { title: "Lugar no encontrado | Celimap" }
    }
    await connectDB()
    const place = await Place.findById(new mongoose.Types.ObjectId(id)).lean()
    if (!place) {
      console.error(`[lugar/[id]] No se encontró lugar con id: ${id}`)
      return { title: "Lugar no encontrado | Celimap" }
    }
    const p = place as { name: string; neighborhood: string; type: string; photos?: string[] }
    const BASE_URL =
      process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app"
    const ogImage = p.photos?.[0] || `${BASE_URL}/CelimapLOGO.png`
    return {
      title: p.name,
      description: `${p.name} - ${p.neighborhood}. Lugar sin TACC en Argentina. Reseñas y datos de contacto.`,
      openGraph: {
        title: `${p.name} | Celimap`,
        description: `${p.name} en ${p.neighborhood}. Lugar apto para celíacos en Argentina.`,
        images: [{ url: ogImage, width: 1200, height: 630, alt: p.name }],
      },
    }
  } catch (error) {
    console.error("[lugar/[id]] Error en generateMetadata:", error)
    return { title: "Lugar | Celimap" }
  }
}

export default function LugarLayout({ children }: Props) {
  return <>{children}</>
}
