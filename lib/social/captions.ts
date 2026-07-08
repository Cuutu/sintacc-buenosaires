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
  placesLink: string,
  venturesLink: string,
  placesCount: number | undefined,
  venturesCount: number | undefined,
  hashtags: string
): string {
  const statsParts: string[] = []
  if (placesCount && placesCount > 0) {
    statsParts.push(`${placesCount.toLocaleString("es-AR")} lugares`)
  }
  if (venturesCount && venturesCount > 0) {
    statsParts.push(`${venturesCount.toLocaleString("es-AR")} emprendimientos`)
  }
  const countLine =
    statsParts.length > 0
      ? `Ya hay ${statsParts.join(" y ")} en Celimap — ayudanos a sumar más.`
      : "Ayudanos a mapear lugares y emprendimientos sin gluten."

  if (platform === "tiktok") {
    return [
      "¿Conocés un lugar o una marca sin TACC?",
      "",
      "🗺️ Local con dirección → sugerilo en Celimap",
      "🏪 Marca, viandas, pastelería por IG/WA → sugerí el emprendimiento",
      "",
      countLine,
      "",
      "Links en bio 👇",
      `Lugares: ${placesLink}`,
      `Emprendimientos: ${venturesLink}`,
      "",
      "#Celimap #SinGluten #Celiacos #EmprendimientosSinGluten",
    ].join("\n")
  }

  return [
    "¿Conocés un lugar o emprendimiento sin gluten?",
    "",
    "🗺️ Restaurante, café o panadería con local → sugerilo en el mapa",
    "🏪 Marca, viandas, pastelería por encargo o delivery → sugerí el emprendimiento",
    "",
    countLine,
    "",
    `🔗 Lugares: ${placesLink}`,
    `🔗 Emprendimientos: ${venturesLink}`,
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
  venturesCount?: number
  venturesLink?: string
}): string {
  const { preset, platform, presetTitle, items, link, hashtags, milestone, placesCount, venturesCount, venturesLink } = input

  if (preset === "milestone" && milestone) {
    return buildMilestoneCaption(milestone, platform, link, hashtags)
  }

  if (preset === "cta_suggest" && venturesLink) {
    return buildCtaCaption(platform, link, venturesLink, placesCount, venturesCount, hashtags)
  }

  if (items.length === 0) {
    return `No hay contenido reciente para este preset.\n\n🔗 ${link}`
  }

  return buildDigestCaption(items, platform, presetTitle, link, hashtags)
}
