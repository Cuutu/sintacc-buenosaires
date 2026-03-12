import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getCityBySlug, getTop10CitySlugs } from "@/lib/seo/cities"
import { getPlacesByCity, getTopNeighborhoods } from "@/lib/seo/places"
import { getProvinceBySlug, isProvincialSlug, PROVINCES } from "@/lib/seo/provinces"
import { getPlacesByProvince } from "@/lib/seo/places"
import { getCityTitle, getCityDescription, getSEOTextBlock } from "@/lib/seo/templates"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { SEOTextBlock } from "@/components/seo/SEOTextBlock"
import { PlaceListWithFilters } from "@/components/seo/PlaceListWithFilters"
import { CityPageJsonLd } from "@/components/seo/CityPageJsonLd"
import { CityMapEmbed } from "@/components/seo/CityMapEmbed"
import { EmptyCityPage } from "@/components/seo/EmptyCityPage"
import { Pagination } from "@/components/seo/Pagination"
import { ScrollReveal } from "@/components/scroll-reveal"
import { ProvincialPage } from "./ProvincialPage"

const BASE_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app"

export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  const citySlugs = getTop10CitySlugs()
  const provinceSlugs = PROVINCES.map((p) => p.slug)
  const allSlugs = [...new Set([...citySlugs, ...provinceSlugs])]
  return allSlugs.map((ciudadSlug) => ({ ciudadSlug }))
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ ciudadSlug: string }>
  searchParams: Promise<{ page?: string; barrio?: string }>
}): Promise<Metadata> {
  const { ciudadSlug } = await params

  if (isProvincialSlug(ciudadSlug)) {
    const province = getProvinceBySlug(ciudadSlug)
    if (!province) return { title: "No encontrado" }
    const { total } = await getPlacesByProvince(ciudadSlug)
    return {
      title: province.metaTitle,
      description: province.metaDescription,
      alternates: { canonical: `${BASE_URL}/sin-gluten/${ciudadSlug}` },
      openGraph: {
        title: `Sin gluten en ${province.name} | Celimap`,
        description: `Mapa de restaurantes y tiendas sin TACC en ${province.name}, Argentina.`,
        url: `${BASE_URL}/sin-gluten/${ciudadSlug}`,
        type: "website",
      },
      keywords: [
        `sin gluten ${province.name}`,
        `restaurantes sin TACC ${province.name}`,
        `panaderías sin gluten ${province.name}`,
        `dónde comer sin gluten ${province.name}`,
        `dietéticas sin TACC ${province.name}`,
      ],
    }
  }

  const city = getCityBySlug(ciudadSlug)
  if (!city) return { title: "No encontrado" }

  const search = await searchParams
  const page = Math.max(1, parseInt(search.page || "1", 10))
  const { total, pages } = await getPlacesByCity(ciudadSlug, page)

  const baseCanonical = `${BASE_URL}/sin-gluten/${ciudadSlug}`
  const canonical = page === 1 ? baseCanonical : `${baseCanonical}?page=${page}`

  return {
    title: `Lugares sin TACC en ${city.name} | Celimap`,
    description:
      total === 0
        ? `Mapa colaborativo de restaurantes, panaderías y dietéticas sin gluten en ${city.name}. Reseñas de la comunidad celíaca. Agregá lugares y ayudá a otros celíacos.`
        : getCityDescription(city, total),
    alternates: {
      canonical,
    },
    openGraph: {
      title: `Sin gluten en ${city.name} — Celimap`,
      description:
        total === 0
          ? `Encontrá opciones sin TACC en ${city.name}. Celimap es el mapa colaborativo de la comunidad celíaca.`
          : getCityDescription(city, total),
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

  if (isProvincialSlug(ciudadSlug)) {
    return <ProvincialPage provinceSlug={ciudadSlug} />
  }

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
      <>
        <EmptyCityPage citySlug={ciudadSlug} />
      </>
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
