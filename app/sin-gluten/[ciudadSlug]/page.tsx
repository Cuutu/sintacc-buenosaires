import { notFound } from "next/navigation"
import { cache } from "react"
import { Metadata } from "next"
import Link from "next/link"
import { getCityBySlug, getTop10CitySlugs, CITIES } from "@/lib/seo/cities"
import {
  getPlacesByCity,
  getTopNeighborhoods,
  getCityPageStats,
  getRecentReviewsForCity,
} from "@/lib/seo/places"
import { getCityTitle, getCityDescription, getSEOTextBlock, buildCityFaqs } from "@/lib/seo/templates"
import { getProvinceBySlug } from "@/lib/seo/provinces"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { SEOTextBlock } from "@/components/seo/SEOTextBlock"
import { PlaceListWithFilters } from "@/components/seo/PlaceListWithFilters"
import { CityPageJsonLd } from "@/components/seo/CityPageJsonLd"
import { CityMapEmbed } from "@/components/seo/CityMapEmbed"
import { EmptyCityPage } from "@/components/seo/EmptyCityPage"
import { CityPageExtras } from "@/components/seo/CityPageExtras"
import { Pagination } from "@/components/seo/Pagination"
import { ScrollReveal } from "@/components/scroll-reveal"
import {
  decideCityPageIndexing,
  decisionToRobots,
} from "@/lib/seo/indexing-rules"
import { getGuidesRelatedToCity } from "@/lib/seo/guides"
import { TrackPageView } from "@/components/analytics/TrackPageView"
import { getBaseUrl } from "@/lib/base-url"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { List } from "@/models/List"
import { publicListsQuery } from "@/lib/lists/access"
import { INDEXING_THRESHOLDS } from "@/lib/seo/indexing-config"
import { canonicalCityPlaceFilter } from "@/lib/seo/city-place-match"

const BASE_URL = getBaseUrl()

const getCityPageStatsCached = cache(getCityPageStats)

export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  const citySlugs = getTop10CitySlugs()
  return citySlugs.map((ciudadSlug) => ({ ciudadSlug }))
}

async function getRelatedPublicLists(citySlug: string) {
  const city = getCityBySlug(citySlug)
  if (!city) return []
  try {
    await connectDB()
    const placeIds = await Place.find(canonicalCityPlaceFilter(city), { _id: 1 }).lean()
    if (placeIds.length === 0) return []
    const ids = placeIds.map((p: { _id: unknown }) => p._id)
    const lists = await List.find({
      ...publicListsQuery(),
      placeIds: { $in: ids },
    })
      .select("name placeIds")
      .limit(6)
      .lean()

    return lists
      .map((l: { _id: { toString(): string }; name: string; placeIds?: unknown[] }) => ({
        id: l._id.toString(),
        name: l.name,
        placeCount: l.placeIds?.length ?? 0,
      }))
      .filter((l) => l.placeCount >= INDEXING_THRESHOLDS.publicListMinPlaces)
  } catch {
    return []
  }
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
  const barrio = search.barrio || undefined
  const { total, pages } = await getPlacesByCity(ciudadSlug, page, barrio)
  const stats = await getCityPageStatsCached(ciudadSlug)
  const title = getCityTitle(city, stats)
  const description = getCityDescription(city, stats)

  const baseCanonical = `${BASE_URL}/sin-gluten/${ciudadSlug}`
  // Canonical limpio: page>1 y filtros barrio no crean canónicos indexables distintos
  const canonical = page === 1 && !barrio ? baseCanonical : baseCanonical

  const decision = decideCityPageIndexing(total, ciudadSlug)
  const robots =
    decisionToRobots(decision) ||
    (pages > 0 && page > pages ? { index: false, follow: true } : undefined) ||
    (barrio ? { index: false, follow: true } : undefined) ||
    (page > 1 ? { index: false, follow: true } : undefined)

  return {
    title,
    description,
    ...(robots ? { robots } : {}),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: baseCanonical,
      type: "website",
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

  const province = getProvinceBySlug(city.provinceSlug)

  const search = await searchParams
  const page = Math.max(1, parseInt(search.page || "1", 10))
  const barrio = search.barrio || undefined
  const [{ places, total, pages }, stats, topNeighborhoods, recentReviews, relatedLists] =
    await Promise.all([
      getPlacesByCity(ciudadSlug, page, barrio),
      getCityPageStatsCached(ciudadSlug),
      getTopNeighborhoods(ciudadSlug),
      getRecentReviewsForCity(ciudadSlug, 5),
      getRelatedPublicLists(ciudadSlug),
    ])

  const relatedGuides = getGuidesRelatedToCity(ciudadSlug).slice(0, 4)

  const nearbyCities = CITIES.filter((c) => c.slug !== ciudadSlug)
    .filter((c) => c.provinceSlug === city.provinceSlug || getTop10CitySlugs().includes(c.slug))
    .slice(0, 6)
    .map((c) => ({ slug: c.slug, name: c.name }))

  const faqs = buildCityFaqs(city, stats)

  if (total === 0) {
    return <EmptyCityPage citySlug={ciudadSlug} />
  }

  return (
    <div className="container py-8">
      <TrackPageView event="city_page_view" properties={{ city: ciudadSlug, total }} />
      <Breadcrumbs
        items={[
          { label: "Argentina", href: "/sin-gluten-argentina" },
          ...(province
            ? [
                {
                  label: province.name,
                  href: `/sin-gluten/provincia/${province.slug}`,
                },
              ]
            : []),
          { label: city.name },
        ]}
      />
      <CityPageJsonLd city={city} places={places} totalPlaces={total} faqs={faqs} />
      <h1 className="mt-4 mb-3 text-2xl font-bold md:text-3xl">
        {getCityTitle(city, stats)}
      </h1>
      <p className="mb-6 max-w-3xl text-muted-foreground">
        En {city.name} hay {stats.total} lugar{stats.total === 1 ? "" : "es"} en CeliMap
        {stats.dedicatedGf > 0
          ? `, de los cuales ${stats.dedicatedGf} figuran como 100% libres de gluten`
          : ""}
        {stats.gfOptions > 0
          ? `${stats.dedicatedGf > 0 ? " y" : ","} ${stats.gfOptions} con opciones sin TACC`
          : ""}
        . Usá el mapa y las fichas como guía; confirmá siempre en el local.
      </p>
      <ScrollReveal>
        <div className="mb-12">
          <CityMapEmbed citySlug={ciudadSlug} cityName={city.name} />
        </div>
      </ScrollReveal>
      <PlaceListWithFilters
        places={places}
        citySlug={ciudadSlug}
        cityName={city.name}
        topNeighborhoods={topNeighborhoods}
        provinceSlug={province?.slug}
        provinceName={province?.name}
      />
      <CityPageExtras
        city={city}
        stats={stats}
        recentReviews={recentReviews}
        relatedLists={relatedLists}
        relatedGuides={relatedGuides}
        nearbyCities={nearbyCities}
      />
      <section className="mt-10" aria-labelledby="city-faq">
        <h2 id="city-faq" className="mb-4 text-xl font-semibold">
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
      <SEOTextBlock content={getSEOTextBlock(city, undefined, stats)} className="mt-12" />
      <p className="mt-6 text-sm">
        <Link href="/guias" className="text-primary hover:underline">
          Ver guías para celíacos
        </Link>
        {" · "}
        <Link href="/como-verificamos-los-lugares" className="text-primary hover:underline">
          Cómo trabajamos la información
        </Link>
      </p>
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
