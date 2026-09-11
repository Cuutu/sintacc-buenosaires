export type ChatPlaceLinkCard = {
  nombre: string
  url: string
  tipo?: string
  direccion?: string
  esCienPorcientoSinTacc?: boolean
}

const MD_LUGAR =
  /\[([^\]]+)\]\((https?:\/\/(?:www\.)?celimap\.com\.ar\/lugar\/[^)\s]+|\/lugar\/[^)\s]+)\)/gi

export function toLocalChatHref(url: string): string {
  try {
    const parsed = new URL(url, "https://www.celimap.com.ar")
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase()
    if (host === "celimap.com.ar" || url.startsWith("/")) {
      return `${parsed.pathname}${parsed.search}`
    }
    return url
  } catch {
    return url
  }
}

export function isLocalChatHref(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//")
}

/** Cierra overlay y va a la ficha. En WebView Next Link a veces no navega. */
export function followChatHref(
  event: { preventDefault: () => void; metaKey: boolean; ctrlKey: boolean; button: number },
  href: string,
  onNavigate?: () => void
) {
  const local = toLocalChatHref(href)
  if (!isLocalChatHref(local)) return
  if (event.metaKey || event.ctrlKey || event.button === 1) {
    onNavigate?.()
    return
  }
  event.preventDefault()
  onNavigate?.()
  if (typeof window !== "undefined") window.location.assign(local)
}

function normalizeLugarUrl(raw: string): string {
  try {
    const url = new URL(raw, "https://www.celimap.com.ar")
    const host = url.hostname.replace(/^www\./, "").toLowerCase()
    if (host !== "celimap.com.ar" && !raw.startsWith("/lugar/")) return raw
    return `${url.pathname}${url.search}`
  } catch {
    return raw
  }
}

/** Saca líneas con link a /lugar/ para no duplicar las mini-cards. */
export function stripChatPlaceLinkMarkdown(text: string): string {
  if (!text) return ""
  const kept = text.split("\n").filter((line) => {
    const re = new RegExp(MD_LUGAR.source, "gi")
    return !re.test(line)
  })
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

/** Links a fichas /lugar/ en el markdown del bot. Solo UI. */
export function extractChatPlaceLinks(text: string): ChatPlaceLinkCard[] {
  if (!text) return []
  const seen = new Set<string>()
  const cards: ChatPlaceLinkCard[] = []
  const re = new RegExp(MD_LUGAR.source, "gi")
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    const rawNombre = match[1]?.trim()
    const url = match[2]?.trim()
    if (!rawNombre || !url) continue
    const key = normalizeLugarUrl(url)
    if (seen.has(key)) continue
    seen.add(key)
    const lineStart = text.lastIndexOf("\n", match.index ?? 0)
    const before = text.slice(lineStart + 1, match.index ?? 0)
    const bold = before.match(/\*\*([^*]+)\*\*/)
    const nombre =
      /ver en celimap/i.test(rawNombre) && bold?.[1] ? bold[1].trim() : rawNombre
    cards.push({
      nombre,
      url,
    })
  }
  return cards
}

export function isCienPorcientoBadge(label?: string, flag?: boolean): boolean {
  if (flag) return true
  return Boolean(label && /100\s*%\s*sin\s*tacc/i.test(label))
}
