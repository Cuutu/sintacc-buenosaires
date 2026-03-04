import type { City } from "./cities"
import { getCategoryBySlug } from "./cities"

export function getCityTitle(city: City): string {
  return `Lugares sin gluten en ${city.name} | Celimap`
}

export function getCityDescription(city: City, total?: number): string {
  const count = total != null ? `${total} lugares` : "lugares"
  return `Encontrá ${count} sin gluten en ${city.name}. Restaurantes, panaderías, cafés y más opciones celíacas verificadas por la comunidad.`
}

export function getCategoryTitle(city: City | null, categorySlug: string): string {
  const cat = getCategoryBySlug(categorySlug)
  const catName = cat?.name ?? categorySlug
  if (city) {
    return `${catName} sin gluten en ${city.name} | Celimap`
  }
  return `${catName} sin gluten en Argentina | Celimap`
}

export function getCategoryDescription(city: City | null, categorySlug: string, total?: number): string {
  const cat = getCategoryBySlug(categorySlug)
  const catName = cat?.name ?? categorySlug
  const count = total != null ? `${total} ` : ""
  if (city) {
    return `Encontrá ${count}${catName.toLowerCase()} sin gluten en ${city.name}. Opciones celíacas verificadas por la comunidad.`
  }
  return `Encontrá ${count}${catName.toLowerCase()} sin gluten en Argentina. Opciones celíacas verificadas por la comunidad.`
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
  return "Lugares sin gluten en Argentina | Celimap"
}

export function getArgentinaLandingDescription(): string {
  return "Encontrá restaurantes, panaderías, cafés y más opciones sin gluten en toda Argentina. Mapa de lugares celíacos verificados por la comunidad."
}

export function getTopRankingTitle(city: City): string {
  return `Top lugares sin gluten en ${city.name} | Celimap`
}

export function getTopRankingDescription(city: City): string {
  return `Los mejores lugares sin gluten en ${city.name} según la comunidad celíaca. Restaurantes, panaderías y cafés recomendados.`
}
