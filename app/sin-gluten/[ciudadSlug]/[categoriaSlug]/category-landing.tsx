import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCityBySlug, isValidCategorySlug } from "@/lib/seo/cities"
import { getPlacesByCityAndCategory } from "@/lib/seo/places"
import {
  getCategoryTitle,
  getCategoryDescription,
  getCategoryH1,
  getCategoryIntro,
  getSEOTextBlock,
  buildCityFaqs,
} from "@/lib/seo/templates"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { SEOTextBlock } from "@/components/seo/SEOTextBlock"
import { PlaceListWithFilters } from "@/components/seo/PlaceListWithFilters"
import { CityPageJsonLd } from "@/components/seo/CityPageJsonLd"
import { Pagination } from "@/components/seo/Pagination"
import { CATEGORIES } from "@/lib/seo/cities"
import { getCityPageStats } from "@/lib/seo/places"

import { getBaseUrl } from "@/lib/base-url"
import { decideCityCategoryIndexing, decisionToRobots } from "@/lib/seo/indexing-rules"
import { OG_IMAGE } from "@/lib/seo/og"

const BASE_URL = getBaseUrl()

/** Metadata de ciudad + categoría. `variant` = la ruta /filtrado (?page=): nunca indexable. */
export async function categoryLandingMetadata(
  ciudadSlug: string,
  categoriaSlug: string,
  page: number,
  variant = false
): Promise<Metadata> {
  const city = getCityBySlug(ciudadSlug)
  if (!city || !isValidCategorySlug(categoriaSlug)) return { title: "No encontrado" }

  const { total, pages } = await getPlacesByCityAndCategory(ciudadSlug, categoriaSlug, page)

  const baseCanonical = `${BASE_URL}/sin-gluten/${ciudadSlug}/${categoriaSlug}`
  const canonical = baseCanonical

  const decision = decideCityCategoryIndexing(total, ciudadSlug)
  const robots =
    decisionToRobots(decision) ||
    (pages > 0 && page > pages ? { index: false, follow: true } : undefined) ||
    (page > 1 ? { index: false, follow: true } : undefined) ||
    (variant ? { index: false, follow: true } : undefined)

  return {
    title: getCategoryTitle(city, categoriaSlug),
    description: getCategoryDescription(city, categoriaSlug, total),
    ...(robots ? { robots } : {}),
    alternates: {
      canonical,
    },
    openGraph: {
      title: getCategoryTitle(city, categoriaSlug),
      description: getCategoryDescription(city, categoriaSlug, total),
      url: baseCanonical,
      type: "website",
      images: [OG_IMAGE],
    },
  }
}

/** Cuerpo de ciudad + categoría (la estática y la variante /filtrado). */
export async function CategoryLanding({
  ciudadSlug,
  categoriaSlug,
  page,
}: {
  ciudadSlug: string
  categoriaSlug: string
  page: number
}) {
  const city = getCityBySlug(ciudadSlug)
  if (!city || !isValidCategorySlug(categoriaSlug)) notFound()

  const [{ places, total, pages }, stats] = await Promise.all([
    getPlacesByCityAndCategory(ciudadSlug, categoriaSlug, page),
    getCityPageStats(ciudadSlug),
  ])
  const topNeighborhoods = stats.neighborhoods

  const catName = CATEGORIES.find((c) => c.slug === categoriaSlug)?.name ?? categoriaSlug
  const faqs = buildCityFaqs(city, stats)

  if (total === 0) {
    return (
      <div className="container max-w-5xl px-4 py-12 md:px-5">
        <p className="text-muted-foreground">
          No hay {catName.toLowerCase()} registradas aún en {city.name}.
        </p>
      </div>
    )
  }

  return (
    <div className="container max-w-5xl px-4 py-8 md:px-5 md:py-12">
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
        totalPlaces={total}
        faqs={faqs}
      />
      <h1 className="mt-5 mb-6 text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em] text-olive [text-wrap:balance] md:text-[46px]">
        {getCategoryH1(city, categoriaSlug)}
      </h1>
      <p className="mb-6 max-w-3xl text-muted-foreground">
        {getCategoryIntro(city, categoriaSlug, total)}
      </p>
      <PlaceListWithFilters
        places={places}
        citySlug={ciudadSlug}
        cityName={city.name}
        currentCategory={categoriaSlug}
        topNeighborhoods={topNeighborhoods}
      />
      <section className="mt-10" aria-labelledby="cat-faq">
        <h2 id="cat-faq" className="mb-2 text-[24px] font-extrabold tracking-[-0.025em] text-olive">
          Preguntas frecuentes
        </h2>
        <dl className="border-b border-[#E2DACB]">
          {faqs.map((faq) => (
            <div key={faq.question} className="border-t border-[#E2DACB] py-5">
              <dt className="text-[17px] font-extrabold leading-snug text-olive">{faq.question}</dt>
              <dd className="mt-2 text-[15.5px] leading-relaxed text-[#5E6A60]">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
      <SEOTextBlock
        content={getSEOTextBlock(city, categoriaSlug, stats)}
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
