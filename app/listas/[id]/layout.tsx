import { Metadata } from "next"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import mongoose from "mongoose"

type Props = {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return { title: "Lista | Celimap" }
    }
    await connectDB()
    const list = await List.findById(id).select("name").lean()
    if (!list) return { title: "Lista | Celimap" }
    const name = (list as { name?: string }).name
    return {
      title: name ? `${name} | Celimap` : "Lista | Celimap",
      description: name
        ? `Lista de lugares sin gluten: ${name}. Lugares aptos celíacos en Argentina.`
        : "Lista de lugares sin gluten en Celimap.",
    }
  } catch {
    return { title: "Lista | Celimap" }
  }
}

export default function ListaLayout({ children }: Props) {
  return children
}
