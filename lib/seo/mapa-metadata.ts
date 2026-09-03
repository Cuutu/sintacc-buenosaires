import type { Metadata } from "next"
import { getBaseUrl } from "@/lib/base-url"

export const MAPA_PATH = "/mapa"

/** Query params del mapa interactivo: noindex, canonical limpio. */
export const MAP_NOINDEX_SEARCH_KEYS = [
  "place",
  "citySlugs",
  "provinceSlugs",
  "localitySlugs",
  "lat",
  "lng",
  "zoom",
  "list",
  "type",
  "search",
] as const

export type MapaSearchParams = Record<string, string | string[] | undefined>

function paramPresent(value: string | string[] | undefined): boolean {
  if (value == null) return false
  if (Array.isArray(value)) return value.some((v) => String(v).trim() !== "")
  return String(value).trim() !== ""
}

export function mapaHasNoindexQuery(searchParams: MapaSearchParams = {}): boolean {
  return MAP_NOINDEX_SEARCH_KEYS.some((key) => paramPresent(searchParams[key]))
}

export function mapaCanonicalUrl(): string {
  return `${getBaseUrl()}${MAPA_PATH}`
}

export function buildMapaMetadata(searchParams: MapaSearchParams = {}): Metadata {
  const canonical = mapaCanonicalUrl()
  const noindex = mapaHasNoindexQuery(searchParams)
  return {
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: { url: canonical },
  }
}
