export type ChatPlaceLinkCard = {
  nombre: string
  url: string
  tipo?: string
  direccion?: string
  esCienPorcientoSinTacc?: boolean
}

const MD_LUGAR =
  /\[([^\]]+)\]\((https?:\/\/(?:www\.)?celimap\.com\.ar\/lugar\/[^)\s]+|\/lugar\/[^)\s]+)\)/gi

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
