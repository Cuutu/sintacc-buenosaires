import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getPlacesByCategory } from "@/lib/seo/places"
import { getCategoryTitle, getCategoryDescription, getCategoryH1, getCategoryIntro } from "@/lib/seo/templates"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { PlaceListWithFilters } from "@/components/seo/PlaceListWithFilters"
import { Pagination } from "@/components/seo/Pagination"
import { CATEGORIES, isValidCategorySlug } from "@/lib/seo/cities"

import { getBaseUrl } from "@/lib/base-url"
import { OG_IMAGE } from "@/lib/seo/og"

const BASE_URL = getBaseUrl()

/** Metadata del hub nacional de categoría. `variant` = la ruta /filtrado (?page=). */
export async function nationalCategoryMetadata(
  category: string,
  page: number,
  variant = false
): Promise<Metadata> {
  if (!isValidCategorySlug(category)) return { title: "No encontrado" }

  const { total, pages } = await getPlacesByCategory(category, page)

  const canonical = page === 1 ? `${BASE_URL}/${category}-sin-gluten` : `${BASE_URL}/${category}-sin-gluten?page=${page}`

  return {
    title: getCategoryTitle(null, category),
    description: getCategoryDescription(null, category, total),
    ...(total === 0 || (pages > 0 && page > pages) || (variant && page === 1)
      ? { robots: { index: false, follow: true } }
      : {}),
    alternates: {
      canonical,
    },
    openGraph: {
      title: getCategoryTitle(null, category),
      description: getCategoryDescription(null, category, total),
      url: page === 1 ? `${BASE_URL}/${category}-sin-gluten` : canonical,
      type: "website",
      images: [OG_IMAGE],
    },
  }
}

/** Cuerpo del hub nacional de categoría (la estática y la variante /filtrado). */
export async function NationalCategoryLanding({ category, page }: { category: string; page: number }) {
  if (!isValidCategorySlug(category)) notFound()

  const { places, total, pages } = await getPlacesByCategory(category, page)

  const catName = CATEGORIES.find((c) => c.slug === category)?.name ?? category
  const intro = getCategoryIntro(null, category, total)

  if (total === 0) {
    return (
      <div className="container py-12">
        <p className="text-muted-foreground">
          No hay {catName.toLowerCase()} registradas aun.
        </p>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <Breadcrumbs
        items={[
          { label: "Sin gluten Argentina", href: "/sin-gluten-argentina" },
          { label: `${catName} sin gluten` },
        ]}
      />
      <h1 className="text-2xl md:text-3xl font-bold mt-4 mb-6">
        {getCategoryH1(null, category)}
      </h1>
      {intro ? (
        <p className="mb-6 max-w-3xl text-muted-foreground">{intro}</p>
      ) : null}
      <PlaceListWithFilters
        places={places}
        citySlug=""
        cityName="Argentina"
        currentCategory={category}
        basePath={`/${category}-sin-gluten`}
      />
      {pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={pages}
          basePath={`/${category}-sin-gluten`}
        />
      )}
    </div>
  )
}
