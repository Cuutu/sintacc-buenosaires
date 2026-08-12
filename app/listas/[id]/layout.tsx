import type { Metadata } from "next"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import mongoose from "mongoose"
import { getBaseUrl } from "@/lib/base-url"
import { isPublicListVisibility } from "@/lib/lists/access"
import {
  decidePublicListIndexing,
  decisionToRobots,
} from "@/lib/seo/indexing-rules"
import { CELIMAP_NAME } from "@/lib/seo/brand"

interface ListaLayoutProps {
  params: Promise<{ id: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: ListaLayoutProps): Promise<Metadata> {
    const noindexPrivate: Metadata = {
    title: "Lista privada",
    description: "Lista privada accesible mediante enlace. No indexar.",
    robots: { index: false, follow: false },
    other: {
      "x-robots-tag": "noindex, nofollow, noarchive",
    },
  }

  try {
    const { id } = await params
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return { title: "Lista", robots: { index: false, follow: false } }
    }

    await connectDB()
    const list = await List.findById(id)
      .select("name description isPublic visibility placeIds updatedAt")
      .lean()

    if (!list) {
      return { title: "Lista", robots: { index: false, follow: false } }
    }

    const isPublic = isPublicListVisibility(list.visibility, list.isPublic)
    if (!isPublic) {
      // Privadas: sin descripción rica, sin OG indexable, noindex,nofollow
      return noindexPrivate
    }

    const placeCount = Array.isArray(list.placeIds) ? list.placeIds.length : 0
    const decision = decidePublicListIndexing({ isPublic: true, placeCount })
    const robots = decisionToRobots(decision)

    const baseUrl = getBaseUrl()
    const canonical = `${baseUrl}/listas/${id}`
    const title = list.name
    const description =
      list.description ||
      `Lista pública de lugares sin TACC: ${list.name}. Curada en ${CELIMAP_NAME}.`

    return {
      title,
      description,
      ...(robots ? { robots } : {}),
      alternates: { canonical },
      openGraph: {
        title: `${title} | ${CELIMAP_NAME}`,
        description,
        url: canonical,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${CELIMAP_NAME}`,
        description,
      },
    }
  } catch {
    return { title: "Lista", robots: { index: false, follow: false } }
  }
}

/** JSON-LD ItemList solo para listas públicas indexables; render SSR en layout. */
async function PublicListJsonLd({ id }: { id: string }) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null
  try {
    await connectDB()
    const list = await List.findById(id)
      .select("name description isPublic visibility placeIds")
      .populate({
        path: "placeIds",
        select: "name slug address status",
      })
      .lean()
    if (!list) return null
    if (!isPublicListVisibility(list.visibility, list.isPublic)) return null

    type PopulatedPlace = {
      _id: { toString(): string }
      name?: string
      slug?: string
      address?: string
      status?: string
    }

    const rawPlaces = (list.placeIds ?? []) as unknown as PopulatedPlace[]
    const places = rawPlaces.filter(
      (p) => p && typeof p === "object" && typeof p.name === "string" && p.status === "approved"
    )
    if (places.length < 3) return null

    const base = getBaseUrl()
    const { getPlacePath } = await import("@/lib/place-url")

    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: list.name,
      description: list.description || undefined,
      numberOfItems: places.length,
      itemListElement: places.slice(0, 30).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "LocalBusiness",
          name: p.name,
          url: `${base}${getPlacePath(p)}`,
          ...(p.address
            ? { address: { "@type": "PostalAddress", streetAddress: p.address } }
            : {}),
        },
      })),
    }

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: base },
        { "@type": "ListItem", position: 2, name: "Listas", item: `${base}/listas` },
        {
          "@type": "ListItem",
          position: 3,
          name: list.name,
          item: `${base}/listas/${id}`,
        },
      ],
    }

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
        />
      </>
    )
  } catch {
    return null
  }
}

export default async function ListaLayout({ children, params }: ListaLayoutProps) {
  const { id } = await params
  return (
    <>
      <PublicListJsonLd id={id} />
      {children}
    </>
  )
}
