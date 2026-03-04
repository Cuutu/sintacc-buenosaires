import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCityBySlug, getTop10CitySlugs } from "@/lib/seo/cities"
import { getPlacesByCity, getTopNeighborhoods } from "@/lib/seo/places"
import { getCityTitle, getCityDescription, getSEOTextBlock } from "@/lib/seo/templates"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { SEOTextBlock } from "@/components/seo/SEOTextBlock"
import { PlaceListWithFilters } from "@/components/seo/PlaceListWithFilters"
import { CityPageJsonLd } from "@/components/seo/CityPageJsonLd"
import { Pagination } from "@/components/seo/Pagination"

const BASE_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app"

export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  const slugs = getTop10CitySlugs()
  return slugs.map((ciudadSlug) => ({ ciudadSlug }))
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ ciudadSlug: string }>
  searchParams: Promise<{ page?: string; barrio?: string }>
}): Promise<Metadata> {
  const { ciudadSlug } = await params
  const city = getCityBySlug(ciudadSlug)
  if (!city) return { title: "No encontrado" }

  const search = await searchParams
  const page = Math.max(1, parseInt(search.page || "1", 10))
  const { total, pages } = await getPlacesByCity(ciudadSlug, page)

  const noIndex = total === 0
  const baseCanonical = noIndex ? `${BASE_URL}/sin-gluten-argentina` : `${BASE_URL}/sin-gluten/${ciudadSlug}`
  const canonical = page === 1 ? baseCanonical : `${baseCanonical}?page=${page}`

  return {
    title: getCityTitle(city),
    description: getCityDescription(city, total),
    robots: noIndex ? { index: false, follow: true } : undefined,
    alternates: {
      canonical,
    },
  }
}

export default async function SinGlutenCiudadPage({
  params,
  searchParams,
}: {
  params: Promise<{ ciudadSlug: string }>
  searchParams: Promise<{ page?: string; barrio?: string }>
}) {
  const { ciudadSlug } = await params
  const city = getCityBySlug(ciudadSlug)
  if (!city) notFound()

  const search = await searchParams
  const page = Math.max(1, parseInt(search.page || "1", 10))
  const barrio = search.barrio || undefined
  const { places, total, pages } = await getPlacesByCity(ciudadSlug, page, barrio)
  const topNeighborhoods = await getTopNeighborhoods(ciudadSlug)

  const faqs = [
    {
      question: `¿Hay restaurantes 100% sin gluten en ${city.name}?`,
      answer: `Sí, varios establecimientos en ${city.name} están certificados o son exclusivamente sin gluten. Buscá el sello "100% sin gluten" en Celimap.`,
    },
    {
      question: `¿Dónde comer sin TACC en ${city.name}?`,
      answer: `Podés usar el mapa de Celimap para ver todos los lugares verificados en ${city.name}. Filtrá por barrio o tipo de local según tu preferencia.`,
    },
    {
      question: `¿Hay panaderías sin gluten en ${city.name}?`,
      answer: `Sí, hay panaderías dedicadas y otras con opciones sin TACC en ${city.name}. Revisá las reseñas de la comunidad para más detalles.`,
    },
  ]

  if (total === 0) {
    return (
      <div className="container py-12">
        <p className="text-muted-foreground">No hay lugares registrados aún en {city.name}.</p>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Breadcrumbs
        items={[
          { label: "Sin gluten Argentina", href: "/sin-gluten-argentina" },
          { label: city.name },
        ]}
      />
      <CityPageJsonLd city={city} places={places} faqs={faqs} />
      <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-6">
        Lugares sin gluten en {city.name}
      </h1>
      <PlaceListWithFilters
        places={places}
        citySlug={ciudadSlug}
        cityName={city.name}
        topNeighborhoods={topNeighborhoods}
      />
      <SEOTextBlock content={getSEOTextBlock(city)} className="mt-12" />
      {pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pages}
          basePath={`/sin-gluten/${ciudadSlug}`}
        />
      )}
    </div>
  )
}
