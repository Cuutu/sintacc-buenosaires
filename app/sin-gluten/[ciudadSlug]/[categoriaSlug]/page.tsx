import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCityBySlug, getTop10CitySlugs, isValidCategorySlug } from "@/lib/seo/cities"
import { getPlacesByCityAndCategory, getTopNeighborhoods } from "@/lib/seo/places"
import {
  getCategoryTitle,
  getCategoryDescription,
  getSEOTextBlock,
} from "@/lib/seo/templates"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { SEOTextBlock } from "@/components/seo/SEOTextBlock"
import { PlaceListWithFilters } from "@/components/seo/PlaceListWithFilters"
import { CityPageJsonLd } from "@/components/seo/CityPageJsonLd"
import { Pagination } from "@/components/seo/Pagination"
import { CATEGORIES } from "@/lib/seo/cities"

const BASE_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app"

export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  const citySlugs = getTop10CitySlugs()
  const categorySlugs = CATEGORIES.map((c) => c.slug)
  const params: { ciudadSlug: string; categoriaSlug: string }[] = []
  for (const ciudadSlug of citySlugs) {
    for (const categoriaSlug of categorySlugs) {
      params.push({ ciudadSlug, categoriaSlug })
    }
  }
  return params
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ ciudadSlug: string; categoriaSlug: string }>
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const { ciudadSlug, categoriaSlug } = await params
  const city = getCityBySlug(ciudadSlug)
  if (!city || !isValidCategorySlug(categoriaSlug)) return { title: "No encontrado" }

  const page = Math.max(1, parseInt((await searchParams).page || "1", 10))
  const { total, pages } = await getPlacesByCityAndCategory(ciudadSlug, categoriaSlug, page)

  const noIndex = total === 0
  const canonical = noIndex
    ? `${BASE_URL}/sin-gluten/${ciudadSlug}`
    : `${BASE_URL}/sin-gluten/${ciudadSlug}/${categoriaSlug}`

  return {
    title: getCategoryTitle(city, categoriaSlug),
    description: getCategoryDescription(city, categoriaSlug, total),
    robots: noIndex ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: page === 1 ? canonical : undefined,
    },
  }
}

export default async function SinGlutenCiudadCategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ ciudadSlug: string; categoriaSlug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { ciudadSlug, categoriaSlug } = await params
  const city = getCityBySlug(ciudadSlug)
  if (!city || !isValidCategorySlug(categoriaSlug)) notFound()

  const page = Math.max(1, parseInt((await searchParams).page || "1", 10))
  const { places, total, pages } = await getPlacesByCityAndCategory(
    ciudadSlug,
    categoriaSlug,
    page
  )
  const topNeighborhoods = await getTopNeighborhoods(ciudadSlug)

  const catName = CATEGORIES.find((c) => c.slug === categoriaSlug)?.name ?? categoriaSlug

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
      question: `¿Hay ${catName.toLowerCase()} sin gluten en ${city.name}?`,
      answer: `Sí, hay ${catName.toLowerCase()} dedicadas y otras con opciones sin TACC en ${city.name}. Revisá las reseñas de la comunidad para más detalles.`,
    },
  ]

  if (total === 0) {
    return (
      <div className="container py-12">
        <p className="text-muted-foreground">
          No hay {catName.toLowerCase()} registradas aún en {city.name}.
        </p>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Breadcrumbs
        items={[
          { label: "Sin gluten Argentina", href: "/sin-gluten-argentina" },
          { label: city.name, href: `/sin-gluten/${ciudadSlug}` },
          { label: catName },
        ]}
      />
      <CityPageJsonLd
        city={city}
        categorySlug={categoriaSlug}
        places={places}
        faqs={faqs}
      />
      <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-6">
        {catName} sin gluten en {city.name}
      </h1>
      <PlaceListWithFilters
        places={places}
        citySlug={ciudadSlug}
        cityName={city.name}
        currentCategory={categoriaSlug}
        topNeighborhoods={topNeighborhoods}
      />
      <SEOTextBlock
        content={getSEOTextBlock(city, categoriaSlug)}
        className="mt-12"
      />
      {pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pages}
          basePath={`/sin-gluten/${ciudadSlug}/${categoriaSlug}`}
        />
      )}
    </div>
  )
}
