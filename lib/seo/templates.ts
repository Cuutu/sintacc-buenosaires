import type { City } from "./cities"
import { getCategoryBySlug } from "./cities"
import type { ProvinceConfig } from "./provinces"

/**
 * Los titles NO incluyen la marca "CeliMap": el layout raíz la agrega una sola vez
 * vía `title: { template: "%s | CeliMap" }`. Así se evita "| CeliMap | CeliMap".
 */

export function getCityTitle(city: City): string {
  return `Lugares sin gluten en ${city.name}`
}

export function getCityDescription(city: City, total?: number): string {
  const count = total != null ? `${total} lugares` : "lugares"
  return `Donde comer sin gluten en ${city.name}. Encontrá ${count} aptos celíacos: restaurantes, panaderías y cafés sin TACC verificados por la comunidad.`
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
    return `Donde comer sin gluten en ${city.name}. ${count}${catName.toLowerCase()} aptos celíacos verificados por la comunidad.`
  }
  return `Encontrá ${count}${catName.toLowerCase()} sin gluten en Argentina. Lugares aptos celíacos verificados por la comunidad.`
}

export function getSEOTextBlock(city: City, categorySlug?: string): string {
  const cat = categorySlug ? getCategoryBySlug(categorySlug) : null
  const catName = cat?.name ?? "lugares"
  const catLower = catName.toLowerCase()

  const h1 = categorySlug
    ? `${catName} sin gluten en ${city.name}`
    : `Lugares sin gluten en ${city.name}`

  const intro = `Si sos celíaco o tenés intolerancia al gluten, encontrar opciones seguras para comer puede ser un desafío. En ${city.name} cada vez hay más ${catLower} que ofrecen opciones sin TACC, desde locales 100% dedicados hasta establecimientos con menú adaptado. Celimap reúne los lugares verificados por la comunidad celíaca para que puedas disfrutar sin preocupaciones.`

  const h2Lugares = `Lugares sin gluten en ${city.name}`
  const pLugares = `La comunidad de Celimap ha identificado y verificado múltiples opciones en ${city.name}. Podés filtrar por tipo de establecimiento: restaurantes, panaderías, cafés, heladerías y tiendas. Cada lugar incluye información sobre si es 100% sin gluten o si ofrece opciones sin TACC, además de reseñas y reportes de la comunidad.`

  const h2Restaurantes = `Restaurantes recomendados`
  const pRestaurantes = `Los restaurantes sin gluten en ${city.name} van desde locales exclusivos para celíacos hasta cocinas que preparan platos especiales. Revisá las etiquetas de cada lugar: "100% sin gluten" indica que todo el menú es seguro, mientras que "opciones sin TACC" requiere que indiques tu condición al pedir.`

  const h2Faq = `Preguntas frecuentes`
  const faq1 = `¿Hay restaurantes 100% sin gluten en ${city.name}? Sí, varios establecimientos en ${city.name} están certificados o son exclusivamente sin gluten. Buscá el sello "100% sin gluten" en Celimap.`
  const faq2 = `¿Dónde comer sin TACC en ${city.name}? Podés usar el mapa de Celimap para ver todos los lugares verificados. Filtrá por barrio o tipo de local según tu preferencia.`
  const faq3 = `¿Hay panaderías sin gluten en ${city.name}? Sí, hay panaderías dedicadas y otras con opciones sin TACC. Revisá las reseñas de la comunidad para más detalles.`

  return [
    `# ${h1}`,
    "",
    intro,
    "",
    `## ${h2Lugares}`,
    "",
    pLugares,
    "",
    `## ${h2Restaurantes}`,
    "",
    pRestaurantes,
    "",
    `## ${h2Faq}`,
    "",
    faq1,
    "",
    faq2,
    "",
    faq3,
  ].join("\n\n")
}

export function getArgentinaLandingTitle(): string {
  return "Lugares sin gluten en Argentina"
}

export function getArgentinaLandingDescription(): string {
  return "Encontrá restaurantes, panaderías, cafés y más opciones sin gluten en toda Argentina. Mapa de lugares celíacos verificados por la comunidad."
}

export function getTopRankingTitle(city: City): string {
  return `Top lugares sin gluten en ${city.name}`
}

export function getTopRankingDescription(city: City): string {
  return `Los mejores lugares sin gluten en ${city.name} según la comunidad celíaca. Restaurantes, panaderías y cafés recomendados.`
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
    parts.push(`Consultá ${data.total} lugares verificados por la comunidad.`)
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
    lines.push("", `Actualmente hay ${data.total} lugares verificados en la provincia.`)
  }
  if (data.dedicatedGf > 0) {
    lines.push("", `${data.dedicatedGf} son 100% sin gluten.`)
  }
  if (data.gfOptions > 0) {
    lines.push("", `${data.gfOptions} ofrecen opciones sin TACC.`)
  }
  if (data.localities > 0) {
    lines.push("", `Las opciones se distribuyen en ${data.localities} localidades.`)
  }
  lines.push(
    "",
    "## ¿Cómo verificar si un lugar es seguro?",
    "",
    "Revisá las etiquetas de cada lugar: \"100% sin gluten\" indica que todo el menú es seguro, mientras que \"opciones sin TACC\" requiere que indiques tu condición al pedir. Leé las reseñas de la comunidad y los reportes de contaminación antes de visitar un lugar."
  )
  return lines.join("\n\n")
}

// Re-export por compatibilidad (deprecated)
export const getProvinceTitle = getProvincePageTitle