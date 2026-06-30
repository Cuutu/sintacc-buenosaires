import { getBaseUrl } from "@/lib/base-url"
import type {
  SocialContentItem,
  SocialMilestoneData,
  SocialPreset,
} from "@/lib/social/types"

export type ImageFormat = "story" | "feed"

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

function getSubtitle(preset: SocialPreset, items: SocialContentItem[]): string {
  if (preset === "neighborhood") {
    return `Sin gluten en ${items[0]?.subtitle ?? "Buenos Aires"}`
  }
  if (preset === "dedicated_gf") return "Opciones 100% sin TACC"
  if (preset === "latest_ventures") return "Marcas y emprendimientos sin gluten"
  if (preset === "latest_places") return "Nuevos en el mapa · Buenos Aires"
  return "Sin gluten en Argentina"
}

function formatListItem(item: SocialContentItem, index: number, withPhotoRef: boolean): string {
  const photoNote =
    withPhotoRef && item.photoUrl
      ? ` · usar foto adjunta #${index + 1} como miniatura`
      : ""
  const parts = [
    `${index + 1}. ${item.name}`,
    `${item.subtitle} · ${item.typeLabel} ${item.typeEmoji}`,
    `${item.safetyDot} ${item.safetyLabel}`,
  ]
  if (item.ratingLine) parts.push(item.ratingLine)
  if (item.extraBadge) parts.push(item.extraBadge)
  if (item.modalitiesLine) parts.push(item.modalitiesLine)
  return `- ${parts.join(" · ")}${photoNote}`
}

function buildAttachmentsBlock(items: SocialContentItem[], includeLogo: boolean): string {
  const baseUrl = getBaseUrl()
  const lines: string[] = [
    "═══ IMÁGENES PARA ADJUNTAR EN CHATGPT ═══",
    "Subí estas imágenes ANTES de pegar el prompt (en el mismo chat):",
    "",
  ]

  let n = 0
  if (includeLogo) {
    n++
    lines.push(`${n}. Logo Celimap → ${baseUrl}/CelimapLOGO.png`)
  }

  for (const item of items) {
    if (!item.photoUrl) continue
    n++
    lines.push(`${n}. Foto de "${item.name}" → ${item.photoUrl}`)
  }

  if (n === 0) {
    lines.push("(No hay fotos en la selección. Podés adjuntar solo el logo Celimap.)")
  }

  lines.push("")
  lines.push(
    "Tip: descargá las fotos desde los links, adjuntalas al chat, y decile a ChatGPT cuál corresponde a cada lugar del listado."
  )
  lines.push("═══════════════════════════════════════════")
  return lines.join("\n")
}

function buildMilestonePrompt(
  presetTitle: string,
  milestone: SocialMilestoneData,
  format: ImageFormat,
  includeLogo: boolean
): string {
  const spec = FORMAT_SPECS[format]
  const baseUrl = getBaseUrl()

  return [
    `Generá UNA sola imagen (${spec.label}, ${spec.ratio}, ${spec.size}) para Celimap.`,
    "",
    "MARCA:",
    "- App mapa sin gluten para celíacos en Argentina",
    "- Fondo oscuro (#0f0f12), acentos verde esmeralda (#10b981)",
    "- Tipografía moderna, legible en celular, estilo app premium",
    includeLogo
      ? "- Usá el logo Celimap adjunto en header o footer"
      : "- Texto de marca: Celimap (sin inventar logos)",
    "",
    "CONTENIDO:",
    `Título grande: "${presetTitle}"`,
    "Subtítulo: La comunidad celíaca crece",
    "",
    "Mostrá estos números como tarjetas o bloques visuales:",
    `• ${milestone.placesCount.toLocaleString("es-AR")} lugares en el mapa`,
    `• ${milestone.reviewsCount.toLocaleString("es-AR")} reseñas`,
    `• ${milestone.venturesCount.toLocaleString("es-AR")} emprendimientos`,
    `• ${milestone.newPlacesThisMonth} lugares nuevos este mes`,
    `• ${milestone.newVenturesThisMonth} emprendimientos nuevos este mes`,
    "",
    `Footer: ${baseUrl.replace(/^https?:\/\//, "")} · Mapa para celíacos`,
    "",
    "REGLAS:",
    "- Una sola imagen cohesiva, NO carousel",
    "- Texto grande y contrastado",
    "- Sin inventar logos de terceros",
    "- Diseño limpio, no saturado",
  ].join("\n")
}

function buildCtaPrompt(link: string, placesCount: number | undefined, format: ImageFormat): string {
  const spec = FORMAT_SPECS[format]
  const baseUrl = getBaseUrl()

  return [
    `Generá UNA sola imagen (${spec.label}, ${spec.ratio}, ${spec.size}) para Celimap.`,
    "",
    "MARCA: fondo oscuro, verde esmeralda #10b981, tipografía clara, estilo app.",
    "",
    'Título: "¿Conocés un lugar sin gluten?"',
    'Subtítulo: "Sugerilo en Celimap"',
    "",
    "Bullets visuales:",
    "• Gratis y en 2 minutos",
    "• Ayudás a otros celíacos",
    placesCount
      ? `• Ya hay ${placesCount.toLocaleString("es-AR")} lugares mapeados`
      : "• Sumá tu lugar favorito al mapa",
    "",
    `CTA visible: ${link}`,
    `Footer: ${baseUrl.replace(/^https?:\/\//, "")}`,
    "",
    "Una sola imagen, CTA legible, sin logos inventados.",
  ].join("\n")
}

export function buildImagePrompt(input: {
  preset: SocialPreset
  presetTitle: string
  items: SocialContentItem[]
  link: string
  format?: ImageFormat
  includeLogo?: boolean
  milestone?: SocialMilestoneData
  placesCount?: number
}): string {
  const {
    preset,
    presetTitle,
    items,
    link,
    format = "story",
    includeLogo = true,
    milestone,
    placesCount,
  } = input
  const spec = FORMAT_SPECS[format]
  const baseUrl = getBaseUrl()

  if (preset === "milestone" && milestone) {
    return buildMilestonePrompt(presetTitle, milestone, format, includeLogo)
  }

  if (preset === "cta_suggest") {
    return buildCtaPrompt(link, placesCount, format)
  }

  if (items.length === 0) {
    return [
      `Generá UNA imagen (${spec.label}, ${spec.ratio}) para Celimap.`,
      "",
      `Título: "${presetTitle}"`,
      "No hay ítems recientes. Diseño minimal con CTA al mapa.",
      `Link: ${link}`,
    ].join("\n")
  }

  const subtitle = getSubtitle(preset, items)
  const listLines = items.map((item, i) => formatListItem(item, i, true))
  const itemsWithPhoto = items.filter((i) => i.photoUrl).length

  return [
    `Generá UNA sola imagen (${spec.label}, ${spec.ratio}, ${spec.size}) para Celimap — mapa sin gluten para celíacos en Argentina.`,
    "",
    "══ ESTILO VISUAL ══",
    "- Fondo oscuro degradado (#0f0f12 → #1a1a1f)",
    "- Acentos verde esmeralda (#10b981), bordes sutiles blanco/10%",
    "- Tipografía sans-serif bold para títulos, regular para listado",
    "- Cards o filas para cada ítem, espaciado generoso",
    "- Legible en pantalla de celular (historia IG)",
    includeLogo
      ? "- Logo Celimap adjunto: usalo en header o footer (no deformar)"
      : '- Marca textual "Celimap" en header',
    "",
    "══ ESTRUCTURA ══",
    `HEADER: "${presetTitle}"`,
    `SUBTÍTULO: "${subtitle}"`,
    "",
    "LISTADO (mostrar TODOS en la misma imagen, scroll visual o cards apiladas):",
    ...listLines,
    "",
    "══ FOOTER ══",
    `${baseUrl.replace(/^https?:\/\//, "")} · Mapa para celíacos`,
    "",
    "══ REFERENCIAS DE FOTO ══",
    itemsWithPhoto > 0
      ? `Hay ${itemsWithPhoto} foto(s) adjunta(s). Usá cada una como miniatura circular o cuadrada junto al nombre correspondiente del listado. NO inventes logos de locales.`
      : "No hay fotos adjuntas: usá íconos genéricos (🍽️ 🥐 etc.) según el tipo.",
    "",
    "══ REGLAS ══",
    "- UNA sola imagen final, NO múltiples slides",
    "- Todos los nombres del listado deben verse",
    "- Sin texto ilegible ni demasiado chico",
    "- No inventar marcas ni logos de terceros",
    "- Diseño profesional tipo app, no clipart",
  ].join("\n")
}

export function buildFullChatGptPackage(input: {
  preset: SocialPreset
  presetTitle: string
  items: SocialContentItem[]
  link: string
  format?: ImageFormat
  includeLogo?: boolean
  milestone?: SocialMilestoneData
  placesCount?: number
}): { prompt: string; attachments: string; combined: string } {
  const prompt = buildImagePrompt(input)
  const attachments = buildAttachmentsBlock(input.items, input.includeLogo ?? true)
  const combined = `${attachments}\n\n${prompt}`
  return { prompt, attachments, combined }
}

export { buildAttachmentsBlock, FORMAT_SPECS }
