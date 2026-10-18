import type { Metadata } from "next"
import { CATEGORIES, getTop10CitySlugs } from "@/lib/seo/cities"
import { CategoryLanding, categoryLandingMetadata } from "./category-landing"

// Estática con ISR: página 1. ?page= lo atiende ./filtrado (rewrite en
// next.config.js), así esta no lee searchParams y no pasa a dinámica.
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

type Props = { params: Promise<{ ciudadSlug: string; categoriaSlug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ciudadSlug, categoriaSlug } = await params
  return categoryLandingMetadata(ciudadSlug, categoriaSlug, 1)
}

export default async function SinGlutenCiudadCategoriaPage({ params }: Props) {
  const { ciudadSlug, categoriaSlug } = await params
  return <CategoryLanding ciudadSlug={ciudadSlug} categoriaSlug={categoriaSlug} page={1} />
}
