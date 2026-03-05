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

/** Centro [lng, lat] y zoom para cada ciudad (mapa centrado) */
const CITY_CENTERS: Record<
  string,
  { center: [number, number]; zoom: number }
> = {
  "buenos-aires": { center: [-58.3816, -34.6037], zoom: 12 },
  cordoba: { center: [-64.1888, -31.4201], zoom: 12 },
  rosario: { center: [-60.6393, -32.9468], zoom: 12 },
  mendoza: { center: [-68.8272, -32.8895], zoom: 12 },
  "la-plata": { center: [-57.9545, -34.9215], zoom: 12 },
  "mar-del-plata": { center: [-57.5753, -38.0055], zoom: 12 },
  "san-miguel-de-tucuman": { center: [-65.2226, -26.8241], zoom: 12 },
  salta: { center: [-65.4117, -24.7859], zoom: 12 },
  "santa-fe": { center: [-60.7, -31.6333], zoom: 12 },
  "san-juan": { center: [-68.5364, -31.5375], zoom: 12 },
  resistencia: { center: [-58.9833, -27.4511], zoom: 12 },
  neuquen: { center: [-68.0591, -38.9516], zoom: 12 },
  corrientes: { center: [-58.8306, -27.4692], zoom: 12 },
  parana: { center: [-60.5233, -31.7446], zoom: 12 },
  "bahia-blanca": { center: [-62.2654, -38.7196], zoom: 12 },
  "san-luis": { center: [-66.335, -33.3017], zoom: 12 },
  "rio-cuarto": { center: [-64.35, -33.13], zoom: 12 },
  "comodoro-rivadavia": { center: [-67.4833, -45.8667], zoom: 11 },
  tandil: { center: [-59.1333, -37.3167], zoom: 12 },
  ushuaia: { center: [-68.2963, -54.8019], zoom: 12 },
}

export function getCityCenter(
  citySlug: string
): { center: [number, number]; zoom: number } | undefined {
  return CITY_CENTERS[citySlug]
}

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
