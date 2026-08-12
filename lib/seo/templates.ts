import type { City } from "./cities"
import { getCategoryBySlug } from "./cities"
import type { ProvinceConfig } from "./provinces"

/**
 * Los titles NO incluyen la marca "CeliMap": el layout raíz la agrega una sola vez
 * vía `title: { template: "%s | CeliMap" }`. Así se evita "| CeliMap | CeliMap".
 */

export function getCityTitle(city: City): string {
  return `Lugares sin TACC en ${city.name}: mapa y recomendaciones`
}

export function getCityDescription(city: City, total?: number): string {
  const count = total != null ? `${total} lugares` : "lugares"
  return `Lugares sin TACC en ${city.name}: mapa y recomendaciones. Encontrá ${count} aptos para personas celíacas: restaurantes, panaderías y cafés según datos de CeliMap.`
}

export function getCategoryTitle(city: City | null, categorySlug: string): string {
  const cat = getCategoryBySlug(categorySlug)
  const catName = cat?.name ?? categorySlug
  if (city) {
    return `${catName} sin gluten en ${city.name}`
  }
  return `${catName} sin gluten en Argentina`
}

export function getCategoryDescription(city: City | null, categorySlug: string, total?: number): string {
  const cat = getCategoryBySlug(categorySlug)
  const catName = cat?.name ?? categorySlug
  const count = total != null ? `${total} ` : ""
  if (city) {
    return `Donde comer sin gluten en ${city.name}. ${count}${catName.toLowerCase()} con información de la comunidad en CeliMap.`
  }
  return `Encontrá ${count}${catName.toLowerCase()} sin gluten en Argentina en el mapa colaborativo CeliMap.`
}

type CityStatsLike = {
  total: number
  dedicatedGf: number
  gfOptions: number
}

export function buildCityFaqs(city: City, stats: CityStatsLike) {
  const dedicatedAnswer =
    stats.dedicatedGf > 0
      ? `En CeliMap hay ${stats.dedicatedGf} lugar${stats.dedicatedGf === 1 ? "" : "es"} en ${city.name} marcados como 100% libres de gluten según la información cargada. Eso no es una certificación médica: confirmá siempre en el local.`
      : `Por ahora no hay lugares en ${city.name} marcados como 100% libres de gluten en CeliMap, o la clasificación aún no está cargada. Revisá opciones sin TACC y preguntá en cada local.`

  const whereAnswer =
    stats.total > 0
      ? `Hay ${stats.total} lugares cargados en ${city.name}. Usá el mapa de esta página o el mapa interactivo, filtrá por categoría y leé reseñas cuando existan.`
      : `Todavía no hay lugares cargados para ${city.name} en CeliMap. Podés sugerir el primero desde Recomendar un lugar.`

  return [
    {
      question: `¿Hay restaurantes 100% sin gluten en ${city.name}?`,
      answer: dedicatedAnswer,
    },
    {
      question: `¿Dónde comer sin TACC en ${city.name}?`,
      answer: whereAnswer,
    },
    {
      question: `¿CeliMap garantiza que un lugar en ${city.name} sea seguro?`,
      answer:
        "No. La información puede provenir de la comunidad y de datos cargados en el mapa. Confirmá protocolos, manipulación y contaminación cruzada antes de comer.",
    },
  ]
}

export function getSEOTextBlock(
  city: City,
  categorySlug?: string,
  stats?: CityStatsLike
): string {
  const cat = categorySlug ? getCategoryBySlug(categorySlug) : null
  const catName = cat?.name ?? "lugares"
  const catLower = catName.toLowerCase()

  // Bloque complementario único: sin H1 duplicado, sin FAQs (van en la sección visible).
  const lines = [
    `## Cómo leer las clasificaciones en ${city.name}`,
    "",
    `"100% libre de gluten" refleja la clasificación cargada en CeliMap. "Con opciones sin TACC" indica una oferta parcial. Ninguna etiqueta garantiza seguridad: confirmá protocolo, manipulación y contaminación cruzada en el local.`,
    "",
    `## Explorar ${catLower}`,
    "",
    stats && stats.total > 0
      ? `En esta página ves ${stats.total} ${catLower} con datos aportados por la comunidad. Filtrá por tipo y leé reseñas cuando existan.`
      : `Cuando haya ${catLower} cargados en ${city.name}, van a aparecer acá con su clasificación y reseñas disponibles.`,
  ]

  return lines.join("\n\n")
}

export function getArgentinaLandingTitle(): string {
  return "Lugares sin gluten en Argentina"
}

export function getArgentinaLandingDescription(): string {
  return "Encontrá restaurantes, panaderías, cafés y más opciones sin gluten en toda Argentina. Mapa colaborativo con datos aportados por la comunidad celíaca."
}

export function getTopRankingTitle(city: City): string {
  return `Lugares sin gluten en ${city.name}`
}

export function getTopRankingDescription(city: City): string {
  return `Lugares sin TACC en ${city.name} en CeliMap. Esta URL redirige a la guía de la ciudad.`
}

// ── Templates provinciales ──
// La marca la agrega el layout raíz. H1 y title son separados.

/** Nombre legible de la jurisdicción para el H1 (CABA y PBA tienen textos especiales). */
function provinceDisplayName(province: ProvinceConfig): string {
  if (province.slug === "caba") return "la Ciudad de Buenos Aires"
  if (province.slug === "buenos-aires") return "la provincia de Buenos Aires"
  return `la provincia de ${province.name}`
}

export function getProvincePageTitle(province: ProvinceConfig): string {
  return `Lugares sin TACC en ${province.name}`
}

export function getProvincePageH1(province: ProvinceConfig): string {
  return `Lugares sin TACC en ${provinceDisplayName(province)}`
}

export function getProvinceDescription(
  province: ProvinceConfig,
  data: { total: number; dedicatedGf: number; localities: number }
): string {
  const parts = [
    `Encontrá restaurantes, cafeterías, panaderías y tiendas sin TACC en ${province.name}.`,
  ]
  if (data.total > 0) {
    parts.push(`Consultá ${data.total} lugares aportados por la comunidad.`)
  }
  if (data.dedicatedGf > 0) {
    parts.push(`${data.dedicatedGf} lugares 100% sin gluten.`)
  }
  if (data.localities > 0) {
    parts.push(`Opciones en ${data.localities} localidades.`)
  }
  return parts.join(" ")
}

export function getProvinceCategoryTitle(province: ProvinceConfig, categorySlug: string): string {
  const cat = getCategoryBySlug(categorySlug)
  const catName = cat?.name ?? categorySlug
  return `${catName} sin TACC en ${province.name}`
}

export function getProvinceCategoryH1(province: ProvinceConfig, categorySlug: string): string {
  const cat = getCategoryBySlug(categorySlug)
  const catName = cat?.name ?? categorySlug
  return `${catName} sin TACC en ${provinceDisplayName(province)}`
}

export function getProvinceCategoryDescription(
  province: ProvinceConfig,
  categorySlug: string,
  total: number
): string {
  const cat = getCategoryBySlug(categorySlug)
  const catName = cat?.name ?? categorySlug
  const count = total > 0 ? `${total} ` : ""
  return `Descubrí ${count}${catName.toLowerCase()} sin TACC en la provincia de ${province.name}. Consultá lugares 100% sin gluten, opciones aptas y reseñas de la comunidad.`
}

export function getProvinceSEOTextBlock(
  province: ProvinceConfig,
  data: { total: number; dedicatedGf: number; gfOptions: number; localities: number }
): string {
  const lines = [
    `# Lugares sin gluten en ${province.name}`,
    "",
    `En ${province.name} la comunidad celíaca comparte en Celimap los lugares donde comer y comprar sin TACC.`,
  ]
  if (data.total > 0) {
    lines.push("", `Actualmente hay ${data.total} lugares cargados en la provincia.`)
  }
  if (data.dedicatedGf > 0) {
    lines.push("", `${data.dedicatedGf} figuran como 100% libres de gluten según la clasificación cargada.`)
  }
  if (data.gfOptions > 0) {
    lines.push("", `${data.gfOptions} ofrecen opciones sin TACC.`)
  }
  if (data.localities > 0) {
    lines.push("", `Las opciones se distribuyen en ${data.localities} localidades.`)
  }
  lines.push(
    "",
    "## Cómo leer las clasificaciones",
    "",
    "\"100% libre de gluten\" refleja la clasificación cargada; \"opciones sin TACC\" indica oferta parcial. Ninguna etiqueta garantiza seguridad: confirmá protocolo y contaminación cruzada en el local. Leé reseñas y reportes cuando existan."
  )
  return lines.join("\n\n")
}

// Re-export por compatibilidad (deprecated)
export const getProvinceTitle = getProvincePageTitle