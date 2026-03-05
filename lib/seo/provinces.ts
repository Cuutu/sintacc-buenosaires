/**
 * Configuración de páginas provinciales SEO.
 *
 * Para agregar una nueva provincia:
 * 1. Agregar un objeto a PROVINCES con: slug, name, citySlugs, metaTitle, metaDescription, h1, introParagraph, closingParagraph
 * 2. Agregar el slug a generateStaticParams en app/sin-gluten/[ciudadSlug]/page.tsx (o usar isProvincialSlug automático)
 *
 * Ejemplo para Mendoza:
 * {
 *   slug: "mendoza",
 *   name: "Mendoza",
 *   citySlugs: ["mendoza"],  // slugs de cities.seed.json
 *   metaTitle: "Sin gluten en Mendoza | Restaurantes y tiendas aptas | Celimap",
 *   metaDescription: "...",
 *   h1: "Establecimientos sin gluten en Mendoza",
 *   introParagraph: "...",
 *   closingParagraph: "...",
 * }
 */

export interface ProvinceConfig {
  slug: string
  name: string
  /** Slugs de ciudades en cities.seed.json que pertenecen a esta provincia */
  citySlugs: string[]
  metaTitle: string
  metaDescription: string
  h1: string
  introParagraph: string
  closingParagraph: string
}

/** Provincias con páginas SEO dedicadas. Solo agregar las que tienen copy y estructura definida. */
export const PROVINCES: ProvinceConfig[] = [
  {
    slug: "cordoba",
    name: "Córdoba",
    citySlugs: ["cordoba", "rio-cuarto"],
    metaTitle: "Sin gluten en Córdoba | Restaurantes y tiendas aptas | Celimap",
    metaDescription:
      "Mapa actualizado de restaurantes, panaderías y dietéticas sin TACC en Córdoba. Encontrá dónde comer y comprar sin gluten en toda la provincia.",
    h1: "Establecimientos sin gluten en Córdoba",
    introParagraph:
      "Córdoba cuenta con una amplia red de restaurantes, panaderías, pastelerías y dietéticas aptas para celíacos. En este mapa encontrás todos los establecimientos sin TACC verificados en la ciudad de Córdoba y alrededores, organizados por tipo para que puedas planificar dónde comer y dónde comprar sin gluten.",
    closingParagraph:
      "¿Conocés un local sin TACC en Córdoba que no está en el mapa? Podés sugerirlo desde la plataforma. Celimap se actualiza constantemente para que la comunidad celíaca de Córdoba tenga siempre la información más completa sobre dónde comer sin gluten, qué dietéticas tienen productos aptos y qué panaderías elaboran sin contaminación cruzada.",
  },
]

export function getProvinceBySlug(slug: string): ProvinceConfig | undefined {
  return PROVINCES.find((p) => p.slug === slug)
}

export function isProvincialSlug(slug: string): boolean {
  return PROVINCES.some((p) => p.slug === slug)
}
