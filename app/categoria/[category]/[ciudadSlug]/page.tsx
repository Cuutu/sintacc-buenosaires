import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCityBySlug, getTop10CitySlugs, isValidCategorySlug, CATEGORIES } from "@/lib/seo/cities"
import { getPlacesByCategoryAndCity, getTopNeighborhoods, getCityPageStats } from "@/lib/seo/places"
import {
  getCategoryTitle,
  getCategoryDescription,
  getSEOTextBlock,
  buildCityFaqs,
} from "@/lib/seo/templates"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { SEOTextBlock } from "@/components/seo/SEOTextBlock"
import { PlaceListWithFilters } from "@/components/seo/PlaceListWithFilters"
import { CityPageJsonLd } from "@/components/seo/CityPageJsonLd"
import { Pagination } from "@/components/seo/Pagination"
import { decideCityCategoryIndexing, decisionToRobots } from "@/lib/seo/indexing-rules"
import { getBaseUrl } from "@/lib/base-url"

const BASE_URL = getBaseUrl()

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
  const { total, pages } = await getPlacesByCategoryAndCity(category, ciudadSlug, page)

  const baseCanonical = `${BASE_URL}/sin-gluten/${ciudadSlug}/${category}`
  const canonical = baseCanonical

  const decision = decideCityCategoryIndexing(total, ciudadSlug)
  const robots =
    decisionToRobots(decision) ||
    (pages > 0 && page > pages ? { index: false, follow: true } : undefined) ||
    (page > 1 ? { index: false, follow: true } : undefined)

  return {
    title: getCategoryTitle(city, category),
    description: getCategoryDescription(city, category, total),
    ...(robots ? { robots } : {}),
    alternates: { canonical },
    openGraph: {
      title: getCategoryTitle(city, category),
      description: getCategoryDescription(city, category, total),
      url: baseCanonical,
      type: "website",
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
  const [{ places, total, pages }, stats, topNeighborhoods] = await Promise.all([
    getPlacesByCategoryAndCity(category, ciudadSlug, page),
    getCityPageStats(ciudadSlug),
    getTopNeighborhoods(ciudadSlug),
  ])

  const catName = CATEGORIES.find((c) => c.slug === category)?.name ?? category
  const faqs = buildCityFaqs(city, stats)

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
          { label: `${catName} sin gluten` },
        ]}
      />
      <CityPageJsonLd
        city={city}
        categorySlug={category}
        places={places}
        totalPlaces={total}
        faqs={faqs}
      />
      <h1 className="mb-6 mt-4 text-2xl font-bold md:text-3xl">
        {catName} sin gluten en {city.name}
      </h1>
      <PlaceListWithFilters
        places={places}
        citySlug={ciudadSlug}
        cityName={city.name}
        currentCategory={category}
        topNeighborhoods={topNeighborhoods}
      />
      <section className="mt-10" aria-labelledby="cat-faq">
        <h2 id="cat-faq" className="mb-4 text-xl font-semibold">
          Preguntas frecuentes
        </h2>
        <dl className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.question} className="rounded-xl border border-border bg-card p-4">
              <dt className="font-medium">{faq.question}</dt>
              <dd className="mt-2 text-sm text-muted-foreground">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
      <SEOTextBlock content={getSEOTextBlock(city, category, stats)} className="mt-12" />
      {pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pages}
          basePath={`/sin-gluten/${ciudadSlug}/${category}`}
        />
      )}
    </div>
  )
}
