import type { City } from "./cities"
import { getCategoryBySlug } from "./cities"
import type { ProvinceConfig } from "./provinces"

/**
 * Los titles NO incluyen la marca "CeliMap": el layout raíz la agrega una sola vez
 * vía `title: { template: "%s | CeliMap" }`. Así se evita "| CeliMap | CeliMap".
 */

type CityStatsLike = {
  total: number
  dedicatedGf: number
  gfOptions: number
}

const LA_PLATA_HUB_TITLE = "Lugares sin TACC en La Plata: mapa y guía"
const LA_PLATA_HUB_H1 = "Lugares sin TACC en La Plata"
const LA_PLATA_HUB_DESCRIPTION =
  "Encontrá restaurantes, panaderías y cafés con opciones sin TACC en La Plata. Mapa colaborativo CeliMap para celíacos."

const CORDOBA_HUB_TITLE = "Dónde comer sin TACC en Córdoba: mapa y guía"
const CORDOBA_HUB_H1 = "Dónde comer sin TACC en Córdoba"
const CORDOBA_HUB_DESCRIPTION =
  "Encontrá restaurantes, panaderías y cafés con opciones sin TACC en Córdoba. Mapa colaborativo CeliMap para celíacos."

const BUENOS_AIRES_HUB_DESCRIPTION =
  "Encontrá lugares con opciones sin TACC en Buenos Aires / CABA: restaurantes, panaderías y cafés. Mapa colaborativo CeliMap."

type SpokeCopy = { title: string; h1: string; description: string }

const NATIONAL_SPOKE_COPY: Record<string, SpokeCopy> = {
  restaurantes: {
    title: "Restaurantes sin TACC en Argentina",
    h1: "Restaurantes sin TACC en Argentina",
    description:
      "Encontrá restaurantes con opciones sin TACC / sin gluten en Argentina. Mapa y fichas colaborativas en CeliMap.",
  },
  panaderias: {
    title: "Panaderías sin TACC en Argentina",
    h1: "Panaderías sin TACC en Argentina",
    description:
      "Panaderías con opciones sin TACC en Argentina. Explorá el mapa CeliMap y filtrá por ciudad.",
  },
  cafes: {
    title: "Cafés sin TACC en Argentina",
    h1: "Cafés sin TACC en Argentina",
    description:
      "Cafés y cafeterías con opciones sin TACC en Argentina. Explorá el mapa CeliMap y filtrá por ciudad.",
  },
  bares: {
    title: "Bares sin TACC en Argentina",
    h1: "Bares sin TACC en Argentina",
    description: "Bares con opciones sin TACC en Argentina. Mapa colaborativo CeliMap.",
  },
}

const CITY_SPOKE_COPY: Record<string, Record<string, SpokeCopy>> = {
  "buenos-aires": {
    restaurantes: {
      title: "Restaurantes sin TACC en CABA (Buenos Aires)",
      h1: "Restaurantes sin TACC en CABA",
      description:
        "Restaurantes con opciones sin TACC en CABA. Fichas y mapa colaborativo CeliMap para celíacos en Buenos Aires.",
    },
    cafes: {
      title: "Cafés sin TACC en CABA (Buenos Aires)",
      h1: "Cafés sin TACC en CABA",
      description: "Cafés con opciones sin TACC en CABA. Fichas y mapa colaborativo CeliMap.",
    },
  },
  "la-plata": {
    restaurantes: {
      title: "Restaurantes sin TACC en La Plata",
      h1: "Restaurantes sin TACC en La Plata",
      description:
        "Restaurantes con opciones sin TACC en La Plata. Listado y mapa en CeliMap, con datos de la comunidad.",
    },
    panaderias: {
      title: "Panaderías sin TACC en La Plata",
      h1: "Panaderías sin TACC en La Plata",
      description:
        "Panaderías con opciones sin TACC en La Plata. Listado y mapa en CeliMap, con datos de la comunidad.",
    },
    cafes: {
      title: "Cafés sin TACC en La Plata",
      h1: "Cafés sin TACC en La Plata",
      description: "Cafés con opciones sin TACC en La Plata. Listado y mapa en CeliMap.",
    },
  },
  cordoba: {
    restaurantes: {
      title: "Restaurantes sin TACC en Córdoba",
      h1: "Restaurantes sin TACC en Córdoba",
      description: "Restaurantes con opciones sin TACC en Córdoba. Listado y mapa CeliMap.",
    },
    cafes: {
      title: "Cafés sin TACC en Córdoba",
      h1: "Cafés sin TACC en Córdoba",
      description: "Cafés con opciones sin TACC en Córdoba. Listado y mapa CeliMap.",
    },
  },
}

function getSpokeCopy(city: City | null, categorySlug: string): SpokeCopy | undefined {
  if (!city) return NATIONAL_SPOKE_COPY[categorySlug]
  return CITY_SPOKE_COPY[city.slug]?.[categorySlug]
}

export function getCityH1(city: City, stats?: CityStatsLike): string {
  if (city.slug === "la-plata") return LA_PLATA_HUB_H1
  if (city.slug === "cordoba") return CORDOBA_HUB_H1
  return getCityTitle(city, stats)
}

export function getCityTitle(city: City, stats?: CityStatsLike): string {
  if (city.slug === "la-plata" && stats && stats.total > 0) {
    return LA_PLATA_HUB_TITLE
  }
  if (city.slug === "cordoba" && stats && stats.total > 0) {
    return CORDOBA_HUB_TITLE
  }
  if (!stats || stats.total === 0) {
    return `Lugares sin TACC en ${city.name} — Guía para celíacos`
  }
  const base = `Dónde comer sin TACC en ${city.name}`
  const withTypes = `${base}: restaurantes y panaderías`
  return withTypes.length <= 60 ? withTypes : base
}

export function getCityDescription(city: City, stats?: CityStatsLike): string {
  if (city.slug === "la-plata" && stats && stats.total > 0) {
    return LA_PLATA_HUB_DESCRIPTION
  }
  if (city.slug === "cordoba" && stats && stats.total > 0) {
    return CORDOBA_HUB_DESCRIPTION
  }
  if (city.slug === "buenos-aires" && stats && stats.total > 0) {
    return BUENOS_AIRES_HUB_DESCRIPTION
  }
  if (!stats || stats.total === 0) {
    return `Todavía no hay lugares aprobados para mostrar en ${city.name}. CeliMap es un mapa colaborativo: cuando la comunidad cargue opciones sin TACC, van a aparecer acá.`
  }
  const n = stats.total
  const lugares = n === 1 ? "lugar" : "lugares"
  const lead = `${n} ${lugares} sin TACC en ${city.name}: restaurantes, panaderías y cafés.`
  const bits: string[] = []
  if (stats.dedicatedGf > 0) {
    const v = stats.dedicatedGf
    bits.push(
      v === 1 ? "1 es 100% libre de gluten" : `${v} son 100% libres de gluten`
    )
  }
  if (stats.gfOptions > 0) {
    bits.push(`${stats.gfOptions} con opciones`)
  }
  const mid = bits.length > 0 ? ` ${bits.join(" y ")},` : ""
  return `${lead}${mid} según datos de CeliMap; confirmá en el local.`
}

export function getCategoryH1(city: City | null, categorySlug: string): string {
  const spoke = getSpokeCopy(city, categorySlug)
  if (spoke) return spoke.h1
  return getCategoryTitle(city, categorySlug)
}

export function getCategoryTitle(city: City | null, categorySlug: string): string {
  const spoke = getSpokeCopy(city, categorySlug)
  if (spoke) return spoke.title
  const cat = getCategoryBySlug(categorySlug)
  const catName = cat?.name ?? categorySlug
  if (city) {
    return `${catName} sin gluten en ${city.name}`
  }
  return `${catName} sin gluten en Argentina`
}

export function getCategoryDescription(city: City | null, categorySlug: string, total?: number): string {
  const spoke = getSpokeCopy(city, categorySlug)
  if (spoke) return spoke.description
  const cat = getCategoryBySlug(categorySlug)
  const catName = cat?.name ?? categorySlug
  const count = total != null ? `${total} ` : ""
  if (city) {
    return `Donde comer sin gluten en ${city.name}. ${count}${catName.toLowerCase()} con información de la comunidad en CeliMap.`
  }
  return `Encontrá ${count}${catName.toLowerCase()} sin gluten en Argentina en el mapa colaborativo CeliMap.`
}

/** Intro visible. Count live cuando el data layer ya lo trae. */
export function getCategoryIntro(
  city: City | null,
  categorySlug: string,
  total: number
): string | null {
  const cat = getCategoryBySlug(categorySlug)
  const catName = (cat?.name ?? categorySlug).toLowerCase()
  if (!city && NATIONAL_SPOKE_COPY[categorySlug]) {
    return `${total} ${catName} con opciones sin TACC en Argentina según datos de CeliMap. Filtrá por ciudad; confirmá siempre en el local.`
  }
  if (city?.slug === "buenos-aires" && (categorySlug === "restaurantes" || categorySlug === "cafes")) {
    return `En CeliMap, CABA usa el slug buenos-aires: esta página lista ${catName} con opciones sin TACC en la Ciudad de Buenos Aires. Confirmá siempre en el local.`
  }
  if (
    city &&
    CITY_SPOKE_COPY[city.slug]?.[categorySlug] &&
    city.slug !== "buenos-aires"
  ) {
    return `${total} ${catName} con opciones sin TACC en ${city.name} según datos de CeliMap. Este listado es la categoría; la guía general de la ciudad está en el hub. Confirmá siempre en el local.`
  }
  if (city) {
    return `${total} ${catName} en ${city.name} según datos de CeliMap. Confirmá siempre en el local protocolos y contaminación cruzada.`
  }
  return null
}

export function getCityCategoryNavLabel(
  citySlug: string,
  categorySlug: string,
  fallback: string
): string {
  const spoke = CITY_SPOKE_COPY[citySlug]?.[categorySlug]
  if (spoke) return spoke.h1
  if (citySlug === "buenos-aires" && categorySlug === "panaderias") {
    return "Panaderías sin TACC en CABA"
  }
  return fallback
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
  return "Lugares sin TACC en Argentina"
}

export function getArgentinaLandingDescription(): string {
  return "Listado y mapa de lugares con opciones sin TACC en Argentina: restaurantes, panaderías, cafés y más. Datos de la comunidad CeliMap."
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
    parts.push(`${data.dedicatedGf} marcados como 100% libres de gluten según la información cargada.`)
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
  return `Descubrí ${count}${catName.toLowerCase()} sin TACC en la provincia de ${province.name}. Consultá lugares 100% libres de gluten según la información cargada, opciones sin TACC y reseñas de la comunidad.`
}

export function getProvinceSEOTextBlock(
  province: ProvinceConfig,
  data: { total: number; dedicatedGf: number; gfOptions: number; localities: number }
): string {
  const lines = [
    `# Lugares sin gluten en ${province.name}`,
    "",
    `En ${province.name} la comunidad celíaca comparte en CeliMap los lugares donde comer y comprar sin TACC.`,
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