import type { Metadata } from "next"
import { parsePageParam } from "@/lib/seo/landing-variants"
import { CityLanding, cityLandingMetadata } from "../city-landing"

// /sin-gluten/[ciudad]?page=N y ?barrio=X llegan acá por un rewrite de
// next.config.js (la URL pública no cambia). Es dinámica a propósito: la
// versión limpia de la página queda estática.
export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ ciudadSlug: string }>
  searchParams: Promise<{ page?: string; barrio?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { ciudadSlug } = await params
  const search = await searchParams
  return cityLandingMetadata(ciudadSlug, parsePageParam(search.page), search.barrio || undefined, true)
}

export default async function SinGlutenCiudadVariantePage({ params, searchParams }: Props) {
  const { ciudadSlug } = await params
  const search = await searchParams
  return (
    <CityLanding ciudadSlug={ciudadSlug} page={parsePageParam(search.page)} barrio={search.barrio || undefined} />
  )
}
