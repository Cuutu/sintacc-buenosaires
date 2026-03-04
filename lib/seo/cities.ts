import citiesData from "@/data/cities.seed.json"

export interface City {
  slug: string
  name: string
  province: string
  neighborhoods: string[]
}

export const CITIES: City[] = citiesData as City[]

export const CATEGORY_SLUG_TO_TYPE: Record<string, string> = {
  restaurantes: "restaurant",
  panaderias: "bakery",
  cafes: "cafe",
  heladerias: "icecream",
  tiendas: "store",
  bares: "bar",
  otros: "other",
}

export const TYPE_TO_CATEGORY_SLUG: Record<string, string> = {
  restaurant: "restaurantes",
  bakery: "panaderias",
  cafe: "cafes",
  icecream: "heladerias",
  store: "tiendas",
  bar: "bares",
  other: "otros",
}

export const CATEGORIES = [
  { slug: "restaurantes", name: "Restaurantes", emoji: "🍽️" },
  { slug: "panaderias", name: "Panaderías", emoji: "🥐" },
  { slug: "cafes", name: "Cafés", emoji: "☕" },
  { slug: "heladerias", name: "Heladerías", emoji: "🍦" },
  { slug: "tiendas", name: "Tiendas", emoji: "🛒" },
  { slug: "bares", name: "Bares", emoji: "🍺" },
  { slug: "otros", name: "Otros", emoji: "📍" },
]

const TOP_10_CITIES = [
  "buenos-aires",
  "cordoba",
  "rosario",
  "mendoza",
  "la-plata",
  "mar-del-plata",
  "san-miguel-de-tucuman",
  "salta",
  "santa-fe",
  "san-juan",
]

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug)
}

export function getCategoryBySlug(slug: string): (typeof CATEGORIES)[0] | undefined {
  return CATEGORIES.find((c) => c.slug === slug)
}

export function getNeighborhoodsForCity(citySlug: string): string[] {
  const city = getCityBySlug(citySlug)
  return city?.neighborhoods ?? []
}

export function getTop10CitySlugs(): string[] {
  return TOP_10_CITIES.filter((s) => CITIES.some((c) => c.slug === s))
}

export function isValidCitySlug(slug: string): boolean {
  return CITIES.some((c) => c.slug === slug)
}

export function isValidCategorySlug(slug: string): boolean {
  return CATEGORIES.some((c) => c.slug === slug)
}
