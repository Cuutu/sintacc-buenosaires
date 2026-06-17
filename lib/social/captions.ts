import type {
  SocialContentItem,
  SocialMilestoneData,
  SocialPlatform,
  SocialPreset,
} from "@/lib/social/types"

function formatPlaceLine(item: SocialContentItem, index: number, compact: boolean): string {
  const extras = [item.extraBadge, item.ratingLine].filter(Boolean).join(" · ")
  if (compact) {
    return `${index + 1}. ${item.name} — ${item.subtitle} ${item.typeEmoji} ${item.safetyDot}`
  }
  const detail = extras ? ` · ${extras}` : ""
  return `${index + 1}. ${item.name} — ${item.subtitle} · ${item.typeLabel}${detail} ${item.safetyDot}`
}

function formatVentureLine(item: SocialContentItem, index: number, compact: boolean): string {
  const mods = item.modalitiesLine ? ` · ${item.modalitiesLine}` : ""
  if (compact) {
    return `${index + 1}. ${item.name} — ${item.subtitle} ${item.safetyDot}`
  }
  return `${index + 1}. ${item.name} — ${item.subtitle} · ${item.typeLabel}${mods} ${item.safetyDot}`
}

function formatItemLine(item: SocialContentItem, index: number, compact: boolean): string {
  return item.kind === "venture"
    ? formatVentureLine(item, index, compact)
    : formatPlaceLine(item, index, compact)
}

function buildDigestCaption(
  items: SocialContentItem[],
  platform: SocialPlatform,
  presetTitle: string,
  link: string,
  hashtags: string
): string {
  const compact = platform === "tiktok"
  const lines = items.map((item, i) => formatItemLine(item, i, compact))

  if (platform === "tiktok") {
    const visible = lines.slice(0, 5)
    const more = lines.length > 5 ? `\n... y ${lines.length - 5} más en Celimap` : ""
    return [
      `🗺️ ${presetTitle}`,
      "",
      ...visible,
      more,
      "",
      "Link en bio 👇",
      link,
      "",
      hashtags.split(" ").slice(0, 5).join(" "),
    ]
      .filter(Boolean)
      .join("\n")
  }

  return [
    `🗺️ ${presetTitle}`,
    "",
    ...lines,
    "",
    "Encontrá opciones sin gluten verificadas por la comunidad celíaca 👇",
    `🔗 ${link}`,
    "",
    hashtags,
  ].join("\n")
}

function buildMilestoneCaption(
  milestone: SocialMilestoneData,
  platform: SocialPlatform,
  link: string,
  hashtags: string
): string {
  const lines = [
    `📍 ${milestone.placesCount.toLocaleString("es-AR")} lugares sin gluten mapeados`,
    `⭐ ${milestone.reviewsCount.toLocaleString("es-AR")} reseñas de la comunidad`,
    `🏪 ${milestone.venturesCount.toLocaleString("es-AR")} emprendimientos sin TACC`,
  ]

  if (milestone.newPlacesThisMonth > 0 || milestone.newVenturesThisMonth > 0) {
    lines.push(
      `🆕 Este mes sumamos ${milestone.newPlacesThisMonth} lugares y ${milestone.newVenturesThisMonth} emprendimientos`
    )
  }

  if (platform === "tiktok") {
    return [
      "🗺️ Celimap crece con la comunidad celíaca",
      "",
      ...lines.slice(0, 3),
      "",
      "Link en bio 👇",
      link,
      "",
      hashtags.split(" ").slice(0, 4).join(" "),
    ].join("\n")
  }

  return [
    "🗺️ Celimap — mapa para celíacos",
    "",
    ...lines,
    "",
    "Gracias por confiar y por sumar lugares 🙌",
    `🔗 ${link}`,
    "",
    hashtags,
  ].join("\n")
}

function buildCtaCaption(
  platform: SocialPlatform,
  link: string,
  placesCount: number | undefined,
  hashtags: string
): string {
  const countLine =
    placesCount && placesCount > 0
      ? `Ya hay ${placesCount.toLocaleString("es-AR")} lugares mapeados — ayudanos a sumar más.`
      : "Ayudanos a mapear opciones sin gluten para toda la comunidad."

  if (platform === "tiktok") {
    return [
      "¿Conocés un restaurante, café o panadería sin TACC?",
      "",
      "Sugerilo en Celimap en 2 minutos 🙌",
      countLine,
      "",
      "Link en bio 👇",
      link,
      "",
      "#Celimap #SinGluten #Celiacos",
    ].join("\n")
  }

  return [
    "¿Conocés un lugar sin gluten que no está en el mapa?",
    "",
    "Sugerilo en Celimap — es gratis y ayudás a otros celíacos 🙌",
    countLine,
    "",
    `🔗 ${link}`,
    "",
    hashtags,
  ].join("\n")
}

export function buildCaption(input: {
  preset: SocialPreset
  platform: SocialPlatform
  presetTitle: string
  items: SocialContentItem[]
  link: string
  hashtags: string
  milestone?: SocialMilestoneData
  placesCount?: number
}): string {
  const { preset, platform, presetTitle, items, link, hashtags, milestone, placesCount } = input

  if (preset === "milestone" && milestone) {
    return buildMilestoneCaption(milestone, platform, link, hashtags)
  }

  if (preset === "cta_suggest") {
    return buildCtaCaption(platform, link, placesCount, hashtags)
  }

  if (items.length === 0) {
    return `No hay contenido reciente para este preset.\n\n🔗 ${link}`
  }

  return buildDigestCaption(items, platform, presetTitle, link, hashtags)
}
