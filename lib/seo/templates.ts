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

  const h1 = categorySlug
    ? `${catName} sin gluten en ${city.name}`
    : `Lugares sin TACC en ${city.name}`

  const intro =
    stats && stats.total > 0
      ? `Si buscás opciones sin TACC en ${city.name}, CeliMap lista ${stats.total} ${catLower} con datos de la comunidad. ${
          stats.dedicatedGf > 0
            ? `${stats.dedicatedGf} figuran como 100% libres de gluten`
            : "Todavía hay pocos o ningún lugar marcado como 100% libre de gluten"
        }${
          stats.gfOptions > 0
            ? ` y ${stats.gfOptions} aparecen con opciones sin TACC`
            : ""
        }. Usá el mapa y las fichas como punto de partida.`
      : `Si sos celíaco o evitás el gluten, encontrar opciones en ${city.name} puede llevar tiempo. CeliMap reúne ${catLower} aportados por la comunidad para explorar el mapa con más contexto.`

  const h2Lugares = `Lugares sin gluten en ${city.name}`
  const pLugares = `Podés filtrar por tipo de establecimiento: restaurantes, panaderías, cafés, heladerías y tiendas. Cada ficha puede indicar si es 100% libre de gluten o si ofrece opciones sin TACC, además de reseñas cuando existen.`

  const h2Restaurantes = `Cómo leer las clasificaciones`
  const pRestaurantes = `"100% libre de gluten" refleja la información cargada en CeliMap; "opciones sin TACC" indica oferta parcial. Ninguna etiqueta reemplaza preguntar en el local por contaminación cruzada.`

  const faqs = buildCityFaqs(city, stats ?? { total: 0, dedicatedGf: 0, gfOptions: 0 })

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
    `## Preguntas frecuentes`,
    "",
    ...faqs.flatMap((f) => [`${f.question} ${f.answer}`, ""]),
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