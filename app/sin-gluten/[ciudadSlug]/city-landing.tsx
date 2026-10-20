import { notFound } from "next/navigation"
import { cache } from "react"
import { Metadata } from "next"
import Link from "next/link"
import { getCityBySlug, getCityCenter, getTop10CitySlugs, CITIES, getCategoryBySlug } from "@/lib/seo/cities"
import {
  getPlacesByCity,
  getCityPageStats,
  getCityPlaceIndex,
  getRecentReviewsForCity,
} from "@/lib/seo/places"
import {
  getCityTitle,
  getCityDescription,
  getCityH1,
  getCityCategoryNavLabel,
  getSEOTextBlock,
  buildCityFaqs,
} from "@/lib/seo/templates"
import { getProvinceBySlug } from "@/lib/seo/provinces"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { SEOTextBlock } from "@/components/seo/SEOTextBlock"
import { PlaceListWithFilters } from "@/components/seo/PlaceListWithFilters"
import { CityPageJsonLd } from "@/components/seo/CityPageJsonLd"
import { CityMapEmbed } from "@/components/seo/CityMapEmbed"
import { EmptyCityPage } from "@/components/seo/EmptyCityPage"
import { CityPageExtras } from "@/components/seo/CityPageExtras"
import { Pagination } from "@/components/seo/Pagination"
import { paginatedPath, paginatedTitle } from "@/lib/seo/pagination"
import { ScrollReveal } from "@/components/scroll-reveal"
import {
  decideCityPageIndexing,
  decisionToRobots,
} from "@/lib/seo/indexing-rules"
import { getGuidesRelatedToCity } from "@/lib/seo/guides"
import { TrackPageView } from "@/components/analytics/TrackPageView"
import { getBaseUrl } from "@/lib/base-url"
import connectDB from "@/lib/mongodb"
import { List } from "@/models/List"
import { publicListsQuery } from "@/lib/lists/access"
import { INDEXING_THRESHOLDS } from "@/lib/seo/indexing-config"
import { OG_IMAGE } from "@/lib/seo/og"

const BASE_URL = getBaseUrl()

const getCityPageStatsCached = cache(getCityPageStats)

function getCityMapHref(citySlug: string): string {
  const city = getCityBySlug(citySlug)
  const center = getCityCenter(citySlug)
  if (city && center) {
    return `/mapa?provinceSlugs=${city.provinceSlug}&localitySlugs=${citySlug}&lng=${center.center[0]}&lat=${center.center[1]}&zoom=${center.zoom}`
  }
  return `/mapa?localitySlugs=${citySlug}`
}

const HUB_SPOKE_SLUGS: Record<string, string[]> = {
  "la-plata": ["restaurantes", "panaderias", "cafes"],
  "buenos-aires": ["restaurantes", "panaderias", "cafes"],
  cordoba: ["restaurantes", "cafes"],
}

function CityHubIntro({
  city,
  stats,
}: {
  city: { slug: string; name: string }
  stats: { total: number; dedicatedGf: number; gfOptions: number }
}) {
  const lugares = stats.total === 1 ? "lugar" : "lugares"
  const linkClass = "text-primary hover:underline"
  const spokeSlugs = HUB_SPOKE_SLUGS[city.slug] ?? []
  const spokeLinks = spokeSlugs.map((catSlug) => {
    const cat = getCategoryBySlug(catSlug)
    const fallback = cat ? `${cat.name} sin TACC` : catSlug
    return (
      <Link
        key={catSlug}
        href={`/sin-gluten/${city.slug}/${catSlug}`}
        className={linkClass}
      >
        {getCityCategoryNavLabel(city.slug, catSlug, fallback)}
      </Link>
    )
  })

  return (
    <p className="mb-6 max-w-3xl text-muted-foreground">
      CeliMap es un mapa colaborativo para celíacos: acá ves lugares cargados por la
      comunidad, no un listado certificado. En {city.name} hay {stats.total} {lugares}
      {stats.dedicatedGf > 0
        ? `, de los cuales ${stats.dedicatedGf} figuran como dedicados sin gluten según la clasificación del mapa`
        : ""}
      {stats.gfOptions > 0
        ? `${stats.dedicatedGf > 0 ? " y" : ","} ${stats.gfOptions} con opciones sin TACC`
        : ""}
      . Para encontrarlos, filtrá{" "}
      {spokeLinks.map((link, i) => (
        <span key={spokeSlugs[i]}>
          {i > 0 ? (i === spokeLinks.length - 1 ? " y " : ", ") : null}
          {link}
        </span>
      ))}
      {" o abrí el "}
      <Link href={getCityMapHref(city.slug)} className={linkClass}>
        mapa de {city.name}
      </Link>
      . Usá las fichas como guía y confirmá siempre en el local.
    </p>
  )
}

async function getRelatedPublicLists(citySlug: string) {
  try {
    const cityPlaces = await getCityPlaceIndex(citySlug)
    if (cityPlaces.length === 0) return []
    const ids = cityPlaces.map((p) => p._id)
    await connectDB()
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

/**
 * Metadata de la landing de ciudad. `variant` = la ruta /filtrado, que atiende
 * ?page= y ?barrio= (ver rewrites en next.config.js). ?page=N (N > 1) es
 * indexable con canónica propia (lib/seo/pagination.ts); ?barrio= y ?page=1 no.
 */
export async function cityLandingMetadata(
  ciudadSlug: string,
  page: number,
  barrio?: string,
  variant = false
): Promise<Metadata> {
  const city = getCityBySlug(ciudadSlug)
  if (!city) return { title: "No encontrado" }

  const { total, pages } = await getPlacesByCity(ciudadSlug, page, barrio)
  const stats = await getCityPageStatsCached(ciudadSlug)
  const title = paginatedTitle(getCityTitle(city, stats), page)
  const description = getCityDescription(city, stats)

  const baseCanonical = `${BASE_URL}/sin-gluten/${ciudadSlug}`
  // ?page=N tiene canónica propia; ?barrio= sigue con la limpia.
  const canonical = barrio ? baseCanonical : paginatedPath(baseCanonical, page)

  const decision = decideCityPageIndexing(total, ciudadSlug)
  const robots =
    decisionToRobots(decision) ||
    (pages > 0 && page > pages ? { index: false, follow: true } : undefined) ||
    (barrio ? { index: false, follow: true } : undefined) ||
    // ?page=1 (o ?page=abc) es la misma página que la limpia.
    (variant && page === 1 ? { index: false, follow: true } : undefined)

  return {
    title,
    description,
    ...(robots ? { robots } : {}),
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [OG_IMAGE],
    },
  }
}

/** Cuerpo de la landing de ciudad (la estática y la variante /filtrado). */
export async function CityLanding({
  ciudadSlug,
  page,
  barrio,
}: {
  ciudadSlug: string
  page: number
  barrio?: string
}) {
  const city = getCityBySlug(ciudadSlug)
  if (!city) notFound()

  const province = getProvinceBySlug(city.provinceSlug)

  const [{ places, total, pages }, stats, recentReviews, relatedLists] = await Promise.all([
    getPlacesByCity(ciudadSlug, page, barrio),
    getCityPageStatsCached(ciudadSlug),
    getRecentReviewsForCity(ciudadSlug, 5),
    getRelatedPublicLists(ciudadSlug),
  ])
  const topNeighborhoods = stats.neighborhoods

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
    <div className="container max-w-5xl px-4 py-8 md:px-5 md:py-12">
      <TrackPageView event="city_page_view" properties={{ city: ciudadSlug, total }} />
      <Breadcrumbs
        items={[
          { label: "Argentina", href: "/sin-gluten-argentina" },
          ...(province
            ? [
                {
                  // "Córdoba > Córdoba" no se entiende: si se llaman igual, se aclara.
                  label:
                    province.name === city.name ? `Provincia de ${province.name}` : province.name,
                  href: `/sin-gluten/provincia/${province.slug}`,
                },
              ]
            : []),
          { label: city.name },
        ]}
      />
      <CityPageJsonLd city={city} places={places} totalPlaces={total} faqs={faqs} />
      <h1 className="mt-5 mb-4 text-[32px] font-extrabold leading-[1.05] tracking-[-0.035em] text-olive [text-wrap:balance] md:text-[46px]">
        {getCityH1(city, stats)}
      </h1>
      {HUB_SPOKE_SLUGS[ciudadSlug] ? (
        <CityHubIntro city={city} stats={stats} />
      ) : (
        <p className="mb-8 max-w-3xl text-lg leading-relaxed text-[#5E6A60]">
          En {city.name} hay {stats.total} lugar{stats.total === 1 ? "" : "es"} en CeliMap
          {stats.dedicatedGf > 0
            ? `, de los cuales ${stats.dedicatedGf} figuran como 100% libres de gluten`
            : ""}
          {stats.gfOptions > 0
            ? `${stats.dedicatedGf > 0 ? " y" : ","} ${stats.gfOptions} con opciones sin TACC`
            : ""}
          . Usá el mapa y las fichas como guía; confirmá siempre en el local.
        </p>
      )}
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
        <h2 id="city-faq" className="mb-2 text-[24px] font-extrabold tracking-[-0.025em] text-olive">
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
