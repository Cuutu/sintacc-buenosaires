import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getPlacesByCategory } from "@/lib/seo/places"
import { getCategoryTitle, getCategoryDescription } from "@/lib/seo/templates"
import { Breadcrumbs } from "@/components/seo/Breadcrumbs"
import { PlaceListWithFilters } from "@/components/seo/PlaceListWithFilters"
import { Pagination } from "@/components/seo/Pagination"
import { CATEGORIES, isValidCategorySlug } from "@/lib/seo/cities"

const BASE_URL = process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "https://sintacc-map.vercel.app"

export const revalidate = 3600

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const { category } = await params
  if (!isValidCategorySlug(category)) return { title: "No encontrado" }

  const page = Math.max(1, parseInt((await searchParams).page || "1", 10))
  const { total, pages } = await getPlacesByCategory(category, page)

  const noIndex = total === 0
  const canonical = `${BASE_URL}/${category}-sin-gluten`

  return {
    title: getCategoryTitle(null, category),
    description: getCategoryDescription(null, category, total),
    robots: noIndex ? { index: false, follow: true } : undefined,
    alternates: {
      canonical: page === 1 ? canonical : undefined,
    },
  }
}

export default async function CategoryGlobalPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { category } = await params
  if (!isValidCategorySlug(category)) notFound()

  const page = Math.max(1, parseInt((await searchParams).page || "1", 10))
  const { places, total, pages } = await getPlacesByCategory(category, page)

  const catName = CATEGORIES.find((c) => c.slug === category)?.name ?? category

  if (total === 0) {
    return (
      <div className="container py-12">
        <p className="text-muted-foreground">
          No hay {catName.toLowerCase()} registradas aún.
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
        {catName} sin gluten en Argentina
      </h1>
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
