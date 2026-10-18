import type { Metadata } from "next"
import { parsePageParam } from "@/lib/seo/landing-variants"
import { CategoryLanding, categoryLandingMetadata } from "../category-landing"

// /sin-gluten/[ciudad]/[categoria]?page=N llega acá por un rewrite de
// next.config.js (la URL pública no cambia). Dinámica a propósito.
export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ ciudadSlug: string; categoriaSlug: string }>
  searchParams: Promise<{ page?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { ciudadSlug, categoriaSlug } = await params
  return categoryLandingMetadata(ciudadSlug, categoriaSlug, parsePageParam((await searchParams).page), true)
}

export default async function SinGlutenCiudadCategoriaVariantePage({ params, searchParams }: Props) {
  const { ciudadSlug, categoriaSlug } = await params
  return (
    <CategoryLanding
      ciudadSlug={ciudadSlug}
      categoriaSlug={categoriaSlug}
      page={parsePageParam((await searchParams).page)}
    />
  )
}
