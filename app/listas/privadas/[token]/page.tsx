import type { Metadata } from "next"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import "@/models/Place"
import "@/models/User"
import { LIST_LINK_STATUS, LIST_VISIBILITY } from "@/lib/lists/constants"
import { isValidPrivateTokenFormat } from "@/lib/lists/private-token"
import { serializeListForPublicViewer } from "@/lib/lists/serialize"
import { PrivateListClientView } from "@/components/lists/PrivateListClientView"
import type { ListWithDetails } from "@/components/lists/ListCard"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const revalidate = 0

interface PageProps {
  params: { token: string }
}

export async function generateMetadata(): Promise<Metadata> {
  // Metadata genérica: no filtrar título/contenido privado a previews externas
  return {
    title: "Lista privada | CeliMap",
    description: "Contenido privado de CeliMap.",
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
    openGraph: {
      title: "Lista privada | CeliMap",
      description: "Contenido privado de CeliMap.",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "Lista privada | CeliMap",
      description: "Contenido privado de CeliMap.",
    },
  }
}

async function loadPrivateList(token: string): Promise<ListWithDetails | null> {
  if (!isValidPrivateTokenFormat(token)) return null
  await connectDB()
  const list = await List.findOne({
    privateAccessToken: token,
    visibility: LIST_VISIBILITY.PRIVATE_LINK,
    linkStatus: LIST_LINK_STATUS.ACTIVE,
  })
    .populate("createdBy", "name image")
    .populate("placeIds")
    .lean()

  if (!list) return null
  return serializeListForPublicViewer(list as never) as ListWithDetails
}

export default async function PrivateListaPage({ params }: PageProps) {
  const list = await loadPrivateList(params.token)

  if (!list) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold text-white">Contenido no encontrado</p>
        <p className="mt-2 text-sm text-white/55">
          El enlace no es válido o ya no está disponible.
        </p>
        <Link href="/" className="mt-6 text-sm font-medium text-primary">
          Ir a CeliMap
        </Link>
      </div>
    )
  }

  return <PrivateListClientView list={list} />
}
