import { getBaseUrl } from "@/lib/base-url"
import type {
  SocialContentItem,
  SocialMilestoneData,
  SocialPreset,
} from "@/lib/social/types"

function formatItemBlock(item: SocialContentItem, index: number): string {
  const lines = [
    `${index + 1}. ${item.name.toUpperCase()}`,
    `   ${item.kind === "place" ? "Barrio" : "Zona"}: ${item.subtitle}`,
    `   Tipo: ${item.typeLabel} ${item.typeEmoji}`,
    `   Seguridad: ${item.safetyDot} ${item.safetyLabel}`,
  ]

  if (item.ratingLine) lines.push(`   Reseñas: ${item.ratingLine}`)
  if (item.extraBadge) lines.push(`   Extra: ${item.extraBadge}`)
  if (item.modalitiesLine) lines.push(`   Modalidad: ${item.modalitiesLine}`)
  if (item.photoUrl) lines.push(`   Foto: ${item.photoUrl}`)
  lines.push(`   Link: ${item.celimapUrl}`)

  return lines.join("\n")
}

function buildMilestoneBrief(milestone: SocialMilestoneData, link: string): string {
  const baseUrl = getBaseUrl()
  return [
    "═══ BRIEF CANVA ═══",
    "Título sugerido: Celimap crece con la comunidad",
    "Subtítulo: Mapa sin gluten para celíacos",
    "",
    "SLIDE / DATOS:",
    `• ${milestone.placesCount.toLocaleString("es-AR")} lugares en el mapa`,
    `• ${milestone.reviewsCount.toLocaleString("es-AR")} reseñas de usuarios`,
    `• ${milestone.venturesCount.toLocaleString("es-AR")} emprendimientos`,
    `• ${milestone.newPlacesThisMonth} lugares nuevos este mes`,
    `• ${milestone.newVenturesThisMonth} emprendimientos nuevos este mes`,
    "",
    `Pie sugerido: ${baseUrl.replace(/^https?:\/\//, "")}`,
    `Link del post: ${link}`,
    "═══════════════════",
  ].join("\n")
}

function buildCtaBrief(
  placesLink: string,
  venturesLink: string,
  placesCount?: number,
  venturesCount?: number
): string {
  const baseUrl = getBaseUrl()
  const stats = [
    placesCount ? `${placesCount.toLocaleString("es-AR")} lugares` : null,
    venturesCount ? `${venturesCount.toLocaleString("es-AR")} emprendimientos` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return [
    "═══ BRIEF CANVA ═══",
    "Título: ¿Conocés un lugar o emprendimiento sin gluten?",
    "Subtítulo: Sumá a la comunidad Celimap",
    "",
    "BLOQUE 1 — Lugar con local (mapa):",
    "· Restaurante, café, panadería con dirección",
    `· CTA: ${placesLink}`,
    "",
    "BLOQUE 2 — Emprendimiento (sin local en mapa):",
    "· Marca, viandas, pastelería por IG/WA/delivery",
    `· CTA: ${venturesLink}`,
    "",
    "Bullets:",
    "• Gratis y en 2 minutos",
    "• Ayudás a otros celíacos",
    stats ? `• Ya hay ${stats}` : "• Sumá al mapa de la comunidad",
    "",
    `Pie sugerido: ${baseUrl.replace(/^https?:\/\//, "")}`,
    "═══════════════════",
  ].join("\n")
}

export function buildCanvaBrief(input: {
  preset: SocialPreset
  presetTitle: string
  items: SocialContentItem[]
  link: string
  milestone?: SocialMilestoneData
  placesCount?: number
  venturesCount?: number
  venturesLink?: string
}): string {
  const { preset, presetTitle, items, link, milestone, placesCount, venturesCount, venturesLink } =
    input
  const baseUrl = getBaseUrl()

  if (preset === "milestone" && milestone) {
    return buildMilestoneBrief(milestone, link)
  }

  if (preset === "cta_suggest" && venturesLink) {
    return buildCtaBrief(link, venturesLink, placesCount, venturesCount)
  }

  if (items.length === 0) {
    return [
      "═══ BRIEF CANVA ═══",
      `Título sugerido: ${presetTitle}`,
      "",
      "No hay ítems recientes para este preset.",
      `Link: ${link}`,
      "═══════════════════",
    ].join("\n")
  }

  const subtitle =
    preset === "neighborhood"
      ? `Sin gluten en ${items[0]?.subtitle ?? "Buenos Aires"}`
      : preset === "dedicated_gf"
        ? "Opciones 100% sin TACC"
        : preset === "latest_ventures"
          ? "Marcas y emprendimientos sin gluten"
          : "Sin gluten en Buenos Aires"

  const blocks = items.map((item, i) => formatItemBlock(item, i))

  return [
    "═══ BRIEF CANVA ═══",
    `Título sugerido: ${presetTitle}`,
    `Subtítulo: ${subtitle}`,
    "",
    ...blocks,
    "",
    `Pie sugerido: ${baseUrl.replace(/^https?:\/\//, "")} · Mapa para celíacos`,
    `Link del post: ${link}`,
    "═══════════════════",
  ].join("\n")
}

export function buildPhotoUrlsList(items: SocialContentItem[]): string {
  return items
    .map((item) => item.photoUrl)
    .filter(Boolean)
    .join("\n")
}

export function buildCelimapUrlsList(items: SocialContentItem[]): string {
  return items.map((item) => item.celimapUrl).join("\n")
}
