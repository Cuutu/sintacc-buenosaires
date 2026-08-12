/**
 * Identidad y copy canónico de CeliMap.
 * Usar en metadata, contenido visible y JSON-LD. No inventar claims médicos ni verificación formal.
 */

export const CELIMAP_NAME = "CeliMap"

/** Descripción canónica (metadata, Organization, WebSite, páginas institucionales). */
export const CELIMAP_DESCRIPTION =
  "CeliMap es un mapa y guía colaborativa para encontrar lugares sin TACC o con opciones aptas para personas celíacas. Permite descubrir restaurantes, cafeterías, panaderías, heladerías, tiendas y emprendimientos, guardar lugares, crear listas y compartir experiencias."

/** Descripción corta para OG / Twitter cuando hace falta acortar. */
export const CELIMAP_DESCRIPTION_SHORT =
  "Mapa y guía colaborativa para encontrar restaurantes, cafeterías, comercios y emprendimientos sin TACC o con opciones aptas para personas celíacas."

export const CELIMAP_TAGLINE =
  "Un mapa y guía colaborativa para encontrar lugares sin TACC o con opciones aptas para personas celíacas."

/**
 * Perfiles oficiales reales. Solo URLs confirmadas.
 */
export const CELIMAP_SAME_AS: string[] = [
  "https://www.instagram.com/celimap_/",
]

/** Aviso responsable visible en páginas de lugares / ciudades / metodología. */
export const CELIMAP_SAFETY_DISCLAIMER =
  "CeliMap no garantiza que un lugar sea seguro para todas las personas celíacas. Antes de comer o comprar, confirmá protocolos, manipulación y riesgo de contaminación cruzada con el local."

export const SAFETY_LABELS = {
  dedicated_gf: "100% libre de gluten",
  gf_options: "Ofrece opciones sin TACC",
  cross_contamination_risk: "Riesgo de contaminación cruzada reportado",
  unknown: "Sin clasificación clara",
  community: "Información aportada por la comunidad",
} as const

export const CLASSIFICATION_HELP = {
  dedicated_gf:
    "Lugar indicado como 100% libre de gluten según la información cargada en CeliMap (tags o nivel de seguridad). No equivale a certificación médica ni a una auditoría independiente de CeliMap.",
  gf_options:
    "Lugar que, según la información disponible, ofrece opciones sin TACC dentro de un menú o surtido más amplio. Conviene confirmar preparación y contaminación cruzada.",
  community:
    "Datos, reseñas y reportes pueden provenir de la comunidad. Revisá la ficha y preguntá en el local antes de decidir.",
} as const
