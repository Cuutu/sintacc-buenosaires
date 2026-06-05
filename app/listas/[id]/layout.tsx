import type { Metadata } from "next"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import mongoose from "mongoose"
import { getBaseUrl } from "@/lib/base-url"

interface ListaLayoutProps {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: ListaLayoutProps): Promise<Metadata> {
  try {
    const { id } = await params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return { title: "Lista | Celimap", robots: { index: false } }
    }

    await connectDB()
    const list = await List.findById(id).select("name description isPublic").lean()
    if (!list || !list.isPublic) {
      return { title: "Lista | Celimap", robots: { index: false } }
    }

    const baseUrl = getBaseUrl()
    const canonical = `${baseUrl}/listas/${id}`
    const title = `${list.name} | Celimap`
    const description =
      list.description ||
      `Lista de lugares sin gluten: ${list.name}. Restaurantes, cafes y panaderias aptas para celiacos.`

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
      },
    }
  } catch {
    return { title: "Lista | Celimap", robots: { index: false } }
  }
}

export default function ListaLayout({ children }: ListaLayoutProps) {
  return children
}
