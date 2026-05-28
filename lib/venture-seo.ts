import type { Metadata } from "next"
import type { VentureCategoryId } from "@/lib/venture-constants"
import {
  getCategoryLabel,
  getModalityLabel,
  getModalityLabels,
} from "@/lib/venture-constants"
import { getBaseUrl } from "@/lib/base-url"

export const VENTURE_DEFAULT_OG_IMAGE = "/og.png"

export type VentureCategoryLandingConfig = {
  categoryId: VentureCategoryId
  slug: string
  h1: string
  intro: string
  title: string
  description: string
}

export type VentureZoneLandingConfig = {
  slug: string
  label: string
  h1: string
  intro: string
  title: string
  description: string
  /** Patrones regex para matchear campo zone */
  zonePatterns: RegExp[]
}

export const VENTURE_CATEGORY_LANDINGS: VentureCategoryLandingConfig[] = [
  {
    categoryId: "pasteleria",
    slug: "pasteleria-sin-gluten",
    h1: "Pastelería sin gluten",
    intro:
      "Encontrá emprendimientos de pastelería sin gluten: tortas, productos dulces y propuestas por encargo. Las opciones son sugeridas por la comunidad de Celimap y se revisan antes de publicarse.",
    title: "Pastelería sin gluten | Emprendimientos recomendados | Celimap",
    description:
      "Encontrá emprendimientos de pastelería sin gluten: tortas, productos dulces y propuestas por encargo aptas para celíacos. Opciones sugeridas por la comunidad.",
  },
  {
    categoryId: "viandas",
    slug: "viandas-sin-gluten",
    h1: "Viandas sin gluten",
    intro:
      "Encontrá emprendimientos que preparan viandas sin gluten para el trabajo, la facultad, el freezer o el día a día. Las opciones son sugeridas por la comunidad de Celimap y se revisan antes de publicarse.",
    title: "Viandas sin gluten | Emprendimientos recomendados | Celimap",
    description:
      "Encontrá emprendimientos que preparan viandas sin gluten para el trabajo, la facultad, el freezer o el día a día. Opciones sugeridas por la comunidad celíaca.",
  },
  {
    categoryId: "panificados",
    slug: "panificados-sin-gluten",
    h1: "Panificados sin gluten",
    intro:
      "Encontrá emprendimientos de panificados sin gluten: panes, budines, medialunas y opciones sin TACC. Sugeridos por la comunidad de Celimap.",
    title: "Panificados sin gluten | Emprendimientos recomendados | Celimap",
    description:
      "Encontrá panificados sin gluten: panes, budines, medialunas y productos aptos sugeridos por la comunidad de Celimap.",
  },
  {
    categoryId: "congelados",
    slug: "congelados-sin-gluten",
    h1: "Congelados sin gluten",
    intro:
      "Encontrá emprendimientos con productos congelados sin gluten para stockar o pedir con anticipación. Opciones sugeridas por la comunidad de Celimap.",
    title: "Congelados sin gluten | Emprendimientos recomendados | Celimap",
    description:
      "Encontrá emprendimientos con congelados sin gluten para freezer y pedidos. Opciones sugeridas por la comunidad celíaca en Celimap.",
  },
  {
    categoryId: "premezclas",
    slug: "premezclas-sin-gluten",
    h1: "Premezclas sin gluten",
    intro:
      "Encontrá emprendimientos que venden premezclas y bases sin gluten para cocinar en casa. Sugeridos por la comunidad de Celimap.",
    title: "Premezclas sin gluten | Emprendimientos recomendados | Celimap",
    description:
      "Encontrá premezclas sin gluten y bases aptas para celíacos. Emprendimientos sugeridos por la comunidad de Celimap.",
  },
  {
    categoryId: "catering",
    slug: "catering-sin-gluten",
    h1: "Catering sin gluten",
    intro:
      "Encontrá emprendimientos de catering sin gluten para eventos, reuniones o pedidos grupales. Opciones sugeridas por la comunidad de Celimap.",
    title: "Catering sin gluten | Emprendimientos recomendados | Celimap",
    description:
      "Encontrá catering sin gluten para eventos y pedidos grupales. Emprendimientos sugeridos por la comunidad celíaca en Celimap.",
  },
]

export const VENTURE_ZONE_LANDINGS: VentureZoneLandingConfig[] = [
  {
    slug: "caba",
    label: "CABA",
    h1: "Emprendimientos sin gluten en CABA",
    intro:
      "Encontrá emprendimientos sin gluten en CABA: viandas, pastelería, panificados, congelados y productos aptos sugeridos por la comunidad de Celimap.",
    title: "Emprendimientos sin gluten en CABA | Celimap",
    description:
      "Encontrá emprendimientos sin gluten en CABA: viandas, pastelería, panificados, congelados y productos aptos sugeridos por la comunidad de Celimap.",
    zonePatterns: [
      /\bcaba\b/i,
      /capital federal/i,
      /ciudad aut[oó]noma/i,
      /c\.?\s*a\.?\s*b\.?\s*a\.?/i,
      /buenos aires\s*\(?(caba|capital)/i,
    ],
  },
  {
    slug: "zona-norte",
    label: "Zona Norte",
    h1: "Emprendimientos sin gluten en Zona Norte",
    intro:
      "Encontrá emprendimientos sin gluten en Zona Norte (GBA): viandas, pastelería, panificados y más. Sugeridos por la comunidad de Celimap.",
    title: "Emprendimientos sin gluten en Zona Norte | Celimap",
    description:
      "Encontrá emprendimientos sin gluten en Zona Norte: viandas, pastelería, panificados y productos aptos sugeridos por la comunidad.",
    zonePatterns: [/zona norte/i, /vicente l[oó]pez/i, /san isidro/i, /tigre/i, /olivos/i, /mart[ií]nez/i],
  },
  {
    slug: "cordoba",
    label: "Córdoba",
    h1: "Emprendimientos sin gluten en Córdoba",
    intro:
      "Encontrá emprendimientos sin gluten en Córdoba y alrededores. Opciones sugeridas por la comunidad de Celimap.",
    title: "Emprendimientos sin gluten en Córdoba | Celimap",
    description:
      "Encontrá emprendimientos sin gluten en Córdoba: viandas, pastelería, panificados y productos aptos sugeridos por la comunidad.",
    zonePatterns: [/c[oó]rdoba/i],
  },
  {
    slug: "rosario",
    label: "Rosario",
    h1: "Emprendimientos sin gluten en Rosario",
    intro:
      "Encontrá emprendimientos sin gluten en Rosario y alrededores. Sugeridos por la comunidad de Celimap.",
    title: "Emprendimientos sin gluten en Rosario | Celimap",
    description:
      "Encontrá emprendimientos sin gluten en Rosario: viandas, pastelería, panificados y productos aptos sugeridos por la comunidad.",
    zonePatterns: [/rosario/i],
  },
]

export const VENTURE_CATEGORY_LANDING_SLUGS = VENTURE_CATEGORY_LANDINGS.map((c) => c.slug)
export const VENTURE_ZONE_LANDING_SLUGS = VENTURE_ZONE_LANDINGS.map((z) => z.slug)

const categoryBySlug = new Map(VENTURE_CATEGORY_LANDINGS.map((c) => [c.slug, c]))
const zoneBySlug = new Map(VENTURE_ZONE_LANDINGS.map((z) => [z.slug, z]))
const categorySlugById = new Map(VENTURE_CATEGORY_LANDINGS.map((c) => [c.categoryId, c.slug]))

export function getCategoryLandingBySlug(slug: string): VentureCategoryLandingConfig | undefined {
  return categoryBySlug.get(slug)
}

export function getZoneLandingBySlug(slug: string): VentureZoneLandingConfig | undefined {
  return zoneBySlug.get(slug)
}

export function getCategoryLandingSlug(categoryId: string): string | undefined {
  return categorySlugById.get(categoryId as VentureCategoryId)
}

export function getCategoryLandingPath(categoryId: string): string {
  const slug = getCategoryLandingSlug(categoryId)
  return slug ? `/emprendimientos/${slug}` : "/emprendimientos"
}

export function getZoneLandingPath(zoneSlug: string): string {
  return `/emprendimientos/${zoneSlug}`
}

/** Descripción SEO larga (ficha + schema). */
export function getVentureSeoDescription(
  name: string,
  category: string,
  zone: string,
  manualDescription?: string
): string {
  if (manualDescription?.trim()) return manualDescription.trim()

  const zonePart = zone?.trim() ? ` en ${zone}` : ""

  const templates: Partial<Record<VentureCategoryId, string>> = {
    pasteleria: `${name} es un emprendimiento de pastelería sin gluten${zonePart}. Fue sugerido por la comunidad de Celimap y puede ser útil para personas que buscan tortas, productos dulces o propuestas sin TACC por pedido.`,
    viandas: `${name} es un emprendimiento de viandas sin gluten${zonePart}. Fue sugerido por la comunidad de Celimap y puede ser útil para personas que buscan comidas aptas para el trabajo, la facultad o el freezer.`,
    panificados: `${name} es un emprendimiento de panificados sin gluten${zonePart}. Fue sugerido por la comunidad de Celimap y puede ser útil para personas que buscan panes, budines, medialunas u opciones sin TACC.`,
  }

  return (
    templates[category as VentureCategoryId] ??
    `${name} es un emprendimiento sin gluten${zonePart} sugerido por la comunidad de Celimap. Podés consultar sus productos, modalidad de compra y disponibilidad antes de consumir.`
  )
}

export function buildVenturePageTitle(name: string, category: string, zone?: string): string {
  const catLabel = getCategoryLabel(category)
  if (zone?.trim()) {
    return `${name} | ${catLabel} sin gluten en ${zone} | Celimap`
  }
  return `${name} | ${catLabel} sin gluten | Celimap`
}

export function buildVentureMetaDescription(
  name: string,
  category: string,
  zone: string,
  modalities: string[]
): string {
  const catLabel = getCategoryLabel(category).toLowerCase()
  const zonePart = zone?.trim() ? ` en ${zone}` : ""
  const modText =
    modalities.length > 0
      ? getModalityLabels(modalities).join(", ")
      : "Consultá modalidad de compra"
  return `Conocé ${name}, emprendimiento de ${catLabel} sin gluten${zonePart}. ${modText}. Información sugerida por la comunidad de Celimap.`
}

export function buildVentureMetadata(input: {
  name: string
  category: string
  zone: string
  modalities: string[]
  slug: string
  description?: string
  photo?: string
}): Metadata {
  const base = getBaseUrl()
  const canonical = `${base}/emprendimientos/${input.slug}`
  const title = buildVenturePageTitle(input.name, input.category, input.zone)
  const description = buildVentureMetaDescription(
    input.name,
    input.category,
    input.zone,
    input.modalities
  )
  const ogImage = input.photo || `${base}${VENTURE_DEFAULT_OG_IMAGE}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: "es_AR",
      siteName: "Celimap",
      images: [{ url: ogImage, width: 1200, height: 630, alt: input.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  }
}

export function buildCategoryLandingMetadata(
  config: VentureCategoryLandingConfig,
  hasContent: boolean
): Metadata {
  const base = getBaseUrl()
  const canonical = `${base}/emprendimientos/${config.slug}`
  return {
    title: config.title,
    description: config.description,
    alternates: { canonical },
    ...(hasContent ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title: config.title,
      description: config.description,
      url: canonical,
      type: "website",
      locale: "es_AR",
      siteName: "Celimap",
      images: [{ url: `${base}${VENTURE_DEFAULT_OG_IMAGE}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
    },
  }
}

export function buildZoneLandingMetadata(
  config: VentureZoneLandingConfig,
  hasContent: boolean
): Metadata {
  const base = getBaseUrl()
  const canonical = `${base}/emprendimientos/${config.slug}`
  return {
    title: config.title,
    description: config.description,
    alternates: { canonical },
    ...(hasContent ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      title: config.title,
      description: config.description,
      url: canonical,
      type: "website",
      locale: "es_AR",
      siteName: "Celimap",
      images: [{ url: `${base}${VENTURE_DEFAULT_OG_IMAGE}`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
    },
  }
}

export function getVentureIndexMetadata(): Metadata {
  const base = getBaseUrl()
  const canonical = `${base}/emprendimientos`
  const title = "Emprendimientos sin gluten | Celimap"
  const description =
    "Marcas, cocineros y proyectos aptos para celíacos: viandas, pastelería, panificados, congelados y más. Recomendados por la comunidad."
  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      "emprendimientos sin gluten",
      "viandas sin gluten",
      "pastelería sin gluten",
      "panificados sin TACC",
      "productos sin gluten delivery",
    ],
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      locale: "es_AR",
      siteName: "Celimap",
      images: [{ url: `${base}${VENTURE_DEFAULT_OG_IMAGE}`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description },
  }
}

export function modalitiesToMetaList(modalities: string[]): string {
  if (!modalities?.length) return "Consultá modalidad de compra"
  return modalities.map((m) => getModalityLabel(m)).join(", ")
}
