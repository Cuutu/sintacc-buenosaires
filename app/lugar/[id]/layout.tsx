import type { Metadata } from "next"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import mongoose from "mongoose"

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return {
        title: "Lugar no encontrado | Celimap",
      }
    }
    await connectDB()
    const place = await Place.findById(id).lean()
    if (!place) {
      return {
        title: "Lugar no encontrado | Celimap",
      }
    }
    const p = place as { name: string; neighborhood: string; type: string }
    return {
      title: `${p.name} | Celimap`,
      description: `${p.name} - ${p.neighborhood}. Lugar sin TACC en Buenos Aires.`,
    }
  } catch {
    return {
      title: "Lugar | Celimap",
    }
  }
}

export default function LugarLayout({ children }: Props) {
  return <>{children}</>
}
