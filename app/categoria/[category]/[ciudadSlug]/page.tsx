import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCityBySlug, getTop10CitySlugs, isValidCategorySlug, CATEGORIES } from "@/lib/seo/cities"
import { getPlacesByCategoryAndCity, getTopNeighborhoods } from "@/lib/seo/places"
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

const BASE_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app"

export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  const citySlugs = getTop10CitySlugs()
  const categorySlugs = CATEGORIES.map((c) => c.slug)
  const params: { category: string; ciudadSlug: string }[] = []
  for (const category of categorySlugs) {
    for (const ciudadSlug of citySlugs) {
      params.push({ category, ciudadSlug })
    }
  }
  return params
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; ciudadSlug: string }>
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const { category, ciudadSlug } = await params
  const city = getCityBySlug(ciudadSlug)
  if (!city || !isValidCategorySlug(category)) return { title: "No encontrado" }

  const page = Math.max(1, parseInt((await searchParams).page || "1", 10))
  const { total } = await getPlacesByCategoryAndCity(category, ciudadSlug, page)

  const noIndex = total === 0
  const baseCanonical = noIndex
    ? `${BASE_URL}/${category}-sin-gluten`
    : `${BASE_URL}/${category}-sin-gluten/${ciudadSlug}`
  const canonical = page === 1 ? baseCanonical : `${baseCanonical}?page=${page}`

  return {
    title: getCategoryTitle(city, category),
    description: getCategoryDescription(city, category, total),
    robots: noIndex ? { index: false, follow: true } : undefined,
    alternates: {
      canonical,
    },
  }
}

export default async function CategoryCityPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; ciudadSlug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { category, ciudadSlug } = await params
  const city = getCityBySlug(ciudadSlug)
  if (!city || !isValidCategorySlug(category)) notFound()

  const page = Math.max(1, parseInt((await searchParams).page || "1", 10))
  const { places, total, pages } = await getPlacesByCategoryAndCity(
    category,
    ciudadSlug,
    page
  )
  const topNeighborhoods = await getTopNeighborhoods(ciudadSlug)

  const catName = CATEGORIES.find((c) => c.slug === category)?.name ?? category

  const faqs = [
    {
      question: `Hay restaurantes 100% sin gluten en ${city.name}?`,
      answer: `Si, varios establecimientos en ${city.name} estan certificados o son exclusivamente sin gluten. Busca el sello "100% sin gluten" en Celimap.`,
    },
    {
      question: `Donde comer sin TACC en ${city.name}?`,
      answer: `Podes usar el mapa de Celimap para ver todos los lugares verificados en ${city.name}. Filtra por barrio o tipo de local segun tu preferencia.`,
    },
    {
      question: `Hay ${catName.toLowerCase()} sin gluten en ${city.name}?`,
      answer: `Si, hay ${catName.toLowerCase()} dedicadas y otras con opciones sin TACC en ${city.name}. Revisa las resenas de la comunidad para mas detalles.`,
    },
  ]

  if (total === 0) {
    return (
      <div className="container py-12">
        <p className="text-muted-foreground">
          No hay {catName.toLowerCase()} registradas aun en {city.name}.
        </p>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Breadcrumbs
        items={[
          { label: "Sin gluten Argentina", href: "/sin-gluten-argentina" },
          { label: `${catName} sin gluten`, href: `/${category}-sin-gluten` },
          { label: city.name },
        ]}
      />
      <CityPageJsonLd
        city={city}
        categorySlug={category}
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
        currentCategory={category}
        topNeighborhoods={topNeighborhoods}
        basePath={`/${category}-sin-gluten`}
      />
      <SEOTextBlock
        content={getSEOTextBlock(city, category)}
        className="mt-12"
      />
      {pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pages}
          basePath={`/${category}-sin-gluten/${ciudadSlug}`}
        />
      )}
    </div>
  )
}
