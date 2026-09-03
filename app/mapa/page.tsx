import type { Metadata } from "next"
import { MapaPageClient } from "@/components/mapa/MapaPageClient"
import { buildMapaMetadata, type MapaSearchParams } from "@/lib/seo/mapa-metadata"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<MapaSearchParams>
}): Promise<Metadata> {
  const params = await searchParams
  return buildMapaMetadata(params)
}

export default function MapaPage() {
  return <MapaPageClient />
}
