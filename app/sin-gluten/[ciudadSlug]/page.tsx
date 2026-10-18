import type { Metadata } from "next"
import { getTop10CitySlugs } from "@/lib/seo/cities"
import { CityLanding, cityLandingMetadata } from "./city-landing"

// Estática con ISR: página 1 sin filtros. ?page= y ?barrio= los atiende
// ./filtrado (rewrite en next.config.js), así esta no lee searchParams y no
// pasa a dinámica. Se regenera sola al cambiar lugares (revalidateSeoLandingPages).
export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  const citySlugs = getTop10CitySlugs()
  return citySlugs.map((ciudadSlug) => ({ ciudadSlug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ciudadSlug: string }>
}): Promise<Metadata> {
  const { ciudadSlug } = await params
  return cityLandingMetadata(ciudadSlug, 1)
}

export default async function SinGlutenCiudadPage({
  params,
}: {
  params: Promise<{ ciudadSlug: string }>
}) {
  const { ciudadSlug } = await params
  return <CityLanding ciudadSlug={ciudadSlug} page={1} />
}
