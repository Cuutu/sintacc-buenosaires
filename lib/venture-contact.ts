import type { VentureCategoryId } from "@/lib/venture-constants"
import { getCategoryLabel } from "@/lib/venture-constants"
import { getVentureSeoDescription } from "@/lib/venture-seo"

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi

export type VentureLinkType = "whatsapp" | "instagram" | "web"

export type ParsedVentureLinks = {
  whatsapp: string | null
  instagram: string | null
  web: string | null
  /** Texto de purchaseChannels sin URLs */
  purchaseText: string | null
}

export function classifyUrl(url: string): VentureLinkType {
  const lower = url.toLowerCase()
  if (
    lower.includes("whatsapp.com") ||
    lower.includes("wa.me") ||
    lower.includes("api.whatsapp")
  ) {
    return "whatsapp"
  }
  if (lower.includes("instagram.com") || lower.includes("instagr.am")) {
    return "instagram"
  }
  return "web"
}

export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) ?? []
}

export function stripUrlsFromText(text: string): string {
  return text
    .replace(URL_REGEX, "")
    .replace(/\s+/g, " ")
    .trim()
}

import { normalizeInstagramUrl } from "@/lib/instagram-url"

export { normalizeInstagramUrl }

/** WhatsApp: teléfono, wa.me o api.whatsapp.com */
export function normalizeWhatsAppUrl(value?: string): string | null {
  if (!value?.trim()) return null
  const v = value.trim()

  const waMe = v.match(/wa\.me\/(\d+)/i)
  if (waMe) return `https://wa.me/${waMe[1]}`

  const apiWa = v.match(/[?&]phone=(\d+)/i)
  if (apiWa) return `https://wa.me/${apiWa[1]}`

  if (/^https?:\/\//i.test(v) && v.toLowerCase().includes("whatsapp")) {
    const digits = v.replace(/\D/g, "")
    if (digits.length >= 8) return `https://wa.me/${digits}`
    return v
  }

  const digits = v.replace(/\D/g, "")
  return digits.length >= 8 ? `https://wa.me/${digits}` : null
}

export function parseVentureLinks(input: {
  contact?: { instagram?: string; whatsapp?: string }
  purchaseChannels?: string
}): ParsedVentureLinks {
  let whatsapp = normalizeWhatsAppUrl(input.contact?.whatsapp)
  let instagram = normalizeInstagramUrl(input.contact?.instagram)
  let web: string | null = null

  const purchase = input.purchaseChannels?.trim() ?? ""
  const urls = purchase ? extractUrls(purchase) : []

  for (const url of urls) {
    const type = classifyUrl(url)
    if (type === "whatsapp" && !whatsapp) {
      whatsapp = normalizeWhatsAppUrl(url)
    } else if (type === "instagram" && !instagram) {
      instagram = normalizeInstagramUrl(url)
    } else if (type === "web" && !web) {
      web = url
    }
  }

  const purchaseText = purchase ? stripUrlsFromText(purchase) || null : null

  return { whatsapp: withWhatsAppOrderMessage(whatsapp), instagram, web, purchaseText }
}

export const VENTURE_WHATSAPP_ORDER_MESSAGE =
  "Hola, los vi en CeliMap y me gustaría hacer un pedido"

/** Chat abre con el mensaje escrito. Solo wa.me: grupos (chat.whatsapp.com) no aceptan `text`. */
export function withWhatsAppOrderMessage(url: string | null): string | null {
  if (!url || !/^https:\/\/wa\.me\/\d+$/.test(url)) return url
  return `${url}?text=${encodeURIComponent(VENTURE_WHATSAPP_ORDER_MESSAGE)}`
}

const DESCRIPTION_FALLBACKS: Partial<Record<VentureCategoryId, string>> = {
  pasteleria:
    "Emprendimiento de pastelería sin gluten sugerido por la comunidad de CeliMap.",
  viandas: "Emprendimiento de viandas sin gluten sugerido por la comunidad de CeliMap.",
  panificados:
    "Emprendimiento de panificados sin gluten sugerido por la comunidad de CeliMap.",
}

export function getVentureDescription(
  description: string | undefined,
  category: string,
  name?: string,
  zone?: string
): string {
  if (name) return getVentureSeoDescription(name, category, zone ?? "", description)
  if (description?.trim()) return description.trim()
  return (
    DESCRIPTION_FALLBACKS[category as VentureCategoryId] ??
    "Emprendimiento sin gluten sugerido por la comunidad de CeliMap."
  )
}

export function buildWhereToBuyCopy(input: {
  links: ParsedVentureLinks
  modalities?: string[]
  purchaseText: string | null
}): string[] {
  const { links, modalities = [], purchaseText } = input
  const lines: string[] = []

  if (purchaseText && !looksLikeUrlOnly(purchaseText)) {
    lines.push(purchaseText)
  }

  if (links.whatsapp) {
    lines.push(
      "Podés consultar productos, precios y disponibilidad directamente por WhatsApp."
    )
  }

  if (links.instagram) {
    lines.push("También podés ver novedades y productos en Instagram.")
  }

  if (links.web) {
    lines.push("Podés comprar o ver más información en su tienda online.")
  }

  if (lines.length === 0) {
    const hasDelivery = modalities.includes("delivery")
    const hasRetiro = modalities.includes("retiro")
    const hasEnvios = modalities.includes("envios")
    const hasFerias = modalities.includes("ferias")

    if (links.whatsapp || hasDelivery || hasRetiro) {
      lines.push(
        "Este emprendimiento recibe pedidos por WhatsApp y coordina delivery o retiro según disponibilidad."
      )
    } else if (hasEnvios) {
      lines.push("Consultá envíos y disponibilidad con el emprendimiento.")
    } else if (hasFerias) {
      lines.push("Podés encontrarlo en ferias o puntos de retiro según calendario.")
    } else {
      lines.push("Contactá al emprendimiento para conocer formas de compra y entrega.")
    }
  }

  return [...new Set(lines)]
}

function looksLikeUrlOnly(text: string): boolean {
  return /^https?:\/\//i.test(text.trim()) && stripUrlsFromText(text).length < 3
}

export function getCategorySubtitle(category: string, zone: string): string {
  return `${getCategoryLabel(category)} · ${zone}`
}
