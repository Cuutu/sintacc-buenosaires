import { getBaseUrl } from "@/lib/base-url"
import type {
  SocialContentItem,
  SocialMilestoneData,
  SocialPreset,
} from "@/lib/social/types"

export type ImageFormat = "story" | "feed"

/** Máximo de ítems en historia IG (legibilidad). */
export const IMAGE_PROMPT_MAX_ITEMS = 5

const FORMAT_SPECS: Record<
  ImageFormat,
  { label: string; ratio: string; size: string }
> = {
  story: {
    label: "Historia de Instagram",
    ratio: "9:16 vertical",
    size: "1080×1920 px",
  },
  feed: {
    label: "Post cuadrado Instagram",
    ratio: "1:1 cuadrado",
    size: "1080×1080 px",
  },
}

export function getHeroTag(preset: SocialPreset): string {
  switch (preset) {
    case "latest_ventures":
      return "NUEVOS EMPRENDIMIENTOS"
    case "neighborhood":
      return "SPOTLIGHT BARRIO"
    case "dedicated_gf":
      return "100% SIN TACC"
    default:
      return "NUEVOS EN EL MAPA"
  }
}

export function getHeroLine(preset: SocialPreset, count: number, items: SocialContentItem[]): string {
  const n = String(count)
  switch (preset) {
    case "latest_ventures":
      return `${n} emprendimientos sin gluten nuevos`
    case "neighborhood":
      return `${n} lugares sin gluten en ${items[0]?.subtitle ?? "el barrio"}`
    case "dedicated_gf":
      return `${n} lugares 100% sin TACC`
    default:
      return `${n} lugares sin gluten esta semana`
  }
}

export function getContextLine(preset: SocialPreset, items: SocialContentItem[]): string {
  if (preset === "neighborhood" && items[0]?.subtitle) {
    return `${items[0].subtitle} · Celimap`
  }
  if (preset === "latest_ventures") {
    return "Argentina · marcas sin gluten"
  }
  return "Buenos Aires · comunidad celíaca"
}

export function formatSafetyShort(item: SocialContentItem): string {
  const label = item.safetyLabel.toLowerCase()
  if (label.includes("100%") || label.includes("100 %")) {
    return `${item.safetyDot} 100% sin gluten`
  }
  if (label.includes("opciones")) {
    return `${item.safetyDot} opciones sin gluten`
  }
  return `${item.safetyDot} a confirmar`
}

/** Fila tipo A: número + nombre + barrio + badge (sin extras). */
function formatListBlock(item: SocialContentItem, index: number): string {
  return [
    `${index + 1}. ${item.name}`,
    `   ${item.subtitle} · ${item.typeLabel} ${item.typeEmoji}`,
    `   ${formatSafetyShort(item)}`,
  ].join("\n")
}

function buildAttachmentsBlock(
  items: SocialContentItem[],
  includeLogo: boolean,
  includePhotos: boolean
): string {
  const baseUrl = getBaseUrl()
  const lines: string[] = [
    "Adjuntá en ChatGPT ANTES de pegar el prompt:",
    "",
  ]

  let n = 0
  if (includeLogo) {
    n++
    lines.push(`${n}. Logo Celimap → ${baseUrl}/CelimapLOGO.png`)
  }

  if (includePhotos) {
    for (const item of items) {
      if (!item.photoUrl) continue
      n++
      lines.push(`${n}. "${item.name}" → ${item.photoUrl}`)
    }
  }

  if (n === 0) {
    lines.push("(Sin adjuntos — solo pegá el prompt)")
  } else if (!includePhotos) {
    lines.push("")
    lines.push("Solo logo. No adjuntes fotos de locales para este estilo.")
  }

  return lines.join("\n")
}

function buildMilestonePrompt(
  presetTitle: string,
  milestone: SocialMilestoneData,
  format: ImageFormat,
  includeLogo: boolean
): string {
  const spec = FORMAT_SPECS[format]
  const domain = getBaseUrl().replace(/^https?:\/\//, "")
  const places = milestone.placesCount.toLocaleString("es-AR")
  const reviews = milestone.reviewsCount.toLocaleString("es-AR")
  const ventures = milestone.venturesCount.toLocaleString("es-AR")

  return [
    `Fallback ChatGPT — preferí Generar imagen (plantilla). ${spec.label} ${spec.ratio}.`,
    "Fondo negro #0a0a0a. Verde #10b981. Blanco. Sin foto. Sin botones.",
    includeLogo ? "Logo Celimap arriba chico." : "",
    'Tag: "LA COMUNIDAD CRECE"',
    `Hero D: número "${places}" verde grande + línea + "lugares en el mapa"`,
    `Sub: "${presetTitle}"`,
    `Stats: ${reviews} reseñas · ${ventures} emprendimientos · ${milestone.newPlacesThisMonth} nuevos este mes`,
    `Footer: ${domain} · Mapa para celíacos`,
  ]
    .filter(Boolean)
    .join("\n")
}

function buildCtaPrompt(
  _placesLink: string,
  _venturesLink: string,
  placesCount: number | undefined,
  venturesCount: number | undefined,
  format: ImageFormat,
  includeLogo: boolean
): string {
  const spec = FORMAT_SPECS[format]
  const domain = getBaseUrl().replace(/^https?:\/\//, "")
  const proof = [
    placesCount ? `${placesCount.toLocaleString("es-AR")} lugares` : null,
    venturesCount ? `${venturesCount.toLocaleString("es-AR")} marcas` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return [
    `Fallback ChatGPT — preferí Generar imagen (plantilla). ${spec.label} ${spec.ratio}.`,
    "MISMO estilo A+D que listados: fondo negro #0a0a0a plano. Sin foto. Sin botones. Sin número inventado.",
    includeLogo ? "Logo Celimap arriba chico." : "",
    'Tag verde: "SUMÁ AL MAPA"',
    'Headline blanco grande (SIN número hero): "¿Conocés algo sin gluten?"',
    'Sub gris: "Ayudá a otros celíacos en 2 minutos"',
    "2 filas numeradas 1 y 2 (como lista):",
    '1. Lugar con local — Resto · café · panadería',
    '2. Emprendimiento — Marca · delivery · IG',
    proof ? `Proof: ${proof}` : "",
    `Footer: ${domain} · Mapa para celíacos`,
    "Links van en caption, no en imagen.",
  ]
    .filter(Boolean)
    .join("\n")
}

/** Estilo A (lista limpia) + hero D (número grande + tag). */
function buildListPrompt(input: {
  preset: SocialPreset
  items: SocialContentItem[]
  format: ImageFormat
  includeLogo: boolean
  includePhotos: boolean
}): string {
  const { preset, format, includeLogo, includePhotos } = input
  const items = input.items.slice(0, IMAGE_PROMPT_MAX_ITEMS)
  const spec = FORMAT_SPECS[format]
  const count = items.length
  const domain = getBaseUrl().replace(/^https?:\/\//, "")
  const heroTag = getHeroTag(preset)
  const heroLine = getHeroLine(preset, count, items)
  const contextLine = getContextLine(preset, items)
  const listBlocks = items.map((item, i) => formatListBlock(item, i)).join("\n\n")

  const lines = [
    `${spec.label} ${spec.ratio} ${spec.size}. UNA sola imagen.`,
    "",
    "Estilo: fondo negro #0a0a0a, verde #10b981, blanco. Minimalista editorial.",
    "Sin cajas/cards, sin gradientes, sin 3D, sin clipart. Sans-serif limpia (tipo Inter).",
    includeLogo ? "Logo Celimap adjunto arriba centrado, chico." : "",
    "",
    `Etiqueta verde chica mayúsculas: "${heroTag}"`,
    "",
    "Hero (tipo D):",
    `- Número "${count}" MUY grande verde a la izquierda`,
    "- Línea vertical blanca fina",
    `- Texto blanco bold a la derecha: "${heroLine}"`,
    "",
    `Subtítulo gris chico: "${contextLine}"`,
    "",
    `Lista (${count} filas, separadas por líneas grises finas, SIN cards):`,
    "",
    listBlocks,
    "",
    "Cada fila: número verde · nombre blanco bold · línea gris barrio·tipo·emoji · badge 🟢/🟡 con texto corto.",
    "",
    `Footer: línea verde fina + "${domain} · Mapa para celíacos"`,
    "",
    "NO logos de marcas. NO badges extra (certificado, cocina separada).",
    includePhotos
      ? "Usá fotos adjuntas solo como miniatura chica si entran; prioridad legibilidad."
      : "NO fotos de comida ni locales.",
    `NO más de ${count} filas.`,
  ]

  return lines.filter(Boolean).join("\n")
}

export function buildImagePrompt(input: {
  preset: SocialPreset
  presetTitle: string
  items: SocialContentItem[]
  link: string
  format?: ImageFormat
  includeLogo?: boolean
  includePhotos?: boolean
  milestone?: SocialMilestoneData
  placesCount?: number
  venturesCount?: number
  venturesLink?: string
}): string {
  const {
    preset,
    presetTitle,
    items,
    link,
    format = "story",
    includeLogo = true,
    includePhotos = false,
    milestone,
    placesCount,
    venturesCount,
    venturesLink,
  } = input

  if (preset === "milestone" && milestone) {
    return buildMilestonePrompt(presetTitle, milestone, format, includeLogo)
  }

  if (preset === "cta_suggest" && venturesLink) {
    return buildCtaPrompt(
      link,
      venturesLink,
      placesCount,
      venturesCount,
      format,
      includeLogo
    )
  }

  if (items.length === 0) {
    const spec = FORMAT_SPECS[format]
    return [
      `${spec.label}. Una imagen minimal Celimap.`,
      `Título: "${presetTitle}"`,
      "Sin ítems — diseño simple con CTA al mapa.",
    ].join("\n")
  }

  return buildListPrompt({ preset, items, format, includeLogo, includePhotos })
}

export function buildFullChatGptPackage(input: {
  preset: SocialPreset
  presetTitle: string
  items: SocialContentItem[]
  link: string
  format?: ImageFormat
  includeLogo?: boolean
  includePhotos?: boolean
  milestone?: SocialMilestoneData
  placesCount?: number
  venturesCount?: number
  venturesLink?: string
}): { prompt: string; attachments: string; combined: string } {
  const slicedItems = input.items.slice(0, IMAGE_PROMPT_MAX_ITEMS)
  const prompt = buildImagePrompt({ ...input, items: slicedItems })
  const attachments = buildAttachmentsBlock(
    slicedItems,
    input.includeLogo ?? true,
    input.includePhotos ?? false
  )
  const combined = attachments ? `${attachments}\n\n${prompt}` : prompt
  return { prompt, attachments, combined }
}

export { buildAttachmentsBlock, FORMAT_SPECS }
