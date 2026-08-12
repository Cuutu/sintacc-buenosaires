import type {
  KmlParseResult,
  KmlPlaceDraft,
  PlaceType,
  SafetyLevel,
} from "@/lib/kml-sintacc/types"

const PLACEHOLDER_ADDRESS = "A completar"

/**
 * Parsea KML de Google My Maps (Sintaccto AMBA).
 * Estructura esperada: Document > Folder > Placemark (Point).
 */
export function parseSintaccAmbaKml(kmlXml: string): KmlParseResult {
  const warnings: string[] = []
  const sourceName =
    matchFirst(kmlXml, /<Document>\s*<name>([^<]*)<\/name>/i)?.trim() ||
    "Mapa KML"

  const folders: string[] = []
  const places: KmlPlaceDraft[] = []

  const folderBlocks = splitFolders(kmlXml)
  if (folderBlocks.length === 0) {
    warnings.push("No se encontraron <Folder>. ¿KML vacío o solo NetworkLink?")
  }

  for (const folder of folderBlocks) {
    folders.push(folder.name)
    const geo = geographyFromFolder(folder.name)

    for (const pm of splitPlacemarks(folder.body)) {
      const name = cleanPlacemarkName(pm.name)
      if (!name) {
        warnings.push(`Placemark sin nombre en carpeta "${folder.name}"`)
        continue
      }

      const coords = parseCoordinates(pm.coordinates)
      if (!coords) {
        warnings.push(`Sin coordenadas: ${name}`)
        continue
      }

      const descriptionHtml = decodeXmlText(pm.description)
      const fields = extractDescriptionFields(descriptionHtml)
      const type = inferTypeFromFreeText(name, descriptionHtml, fields.comercioTipo)
      const structured = mapSafetyAndTags(fields.cocina, fields.materiaPrima)
      const inferred =
        !fields.cocina && !fields.materiaPrima
          ? inferTagsFromFreeText(descriptionHtml)
          : null
      const tags = inferred?.tags ?? structured.tags
      const safetyLevel = inferred?.safetyLevel ?? structured.safetyLevel
      const instagram = extractInstagram(descriptionHtml)
      const openingHours = extractOpeningHours(descriptionHtml)
      const deliveryAvailable = modalidadHasDelivery(fields.modalidad)

      const draft: KmlPlaceDraft = {
        name,
        folder: folder.name,
        type,
        location: coords,
        address: PLACEHOLDER_ADDRESS,
        neighborhood: geo.neighborhood,
        province: geo.province,
        locality: geo.locality,
        tags,
        safetyLevel,
        openingHours: openingHours || undefined,
        contact: instagram ? { instagram } : undefined,
        delivery: deliveryAvailable ? { available: true } : undefined,
        source: "kml",
        raw: {
          comercioTipo: fields.comercioTipo,
          modalidad: fields.modalidad,
          materiaPrima: fields.materiaPrima,
          cocina: fields.cocina,
          descriptionHtml,
        },
      }

      places.push(draft)
    }
  }

  return { sourceName, folders, places, warnings }
}

function splitFolders(kmlXml: string): Array<{ name: string; body: string }> {
  const out: Array<{ name: string; body: string }> = []
  const re = /<Folder\b[^>]*>([\s\S]*?)<\/Folder>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(kmlXml)) !== null) {
    const body = m[1]
    const name = matchFirst(body, /<name>([^<]*)<\/name>/i)?.trim() || "Sin carpeta"
    out.push({ name, body })
  }
  return out
}

function splitPlacemarks(folderBody: string): Array<{
  name: string
  description: string
  coordinates: string
}> {
  const out: Array<{ name: string; description: string; coordinates: string }> = []
  const re = /<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(folderBody)) !== null) {
    const body = m[1]
    const name = matchFirst(body, /<name>([\s\S]*?)<\/name>/i) || ""
    const description =
      matchFirst(body, /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i) ||
      matchFirst(body, /<description>([\s\S]*?)<\/description>/i) ||
      ""
    const coordinates =
      matchFirst(body, /<coordinates>\s*([^<\s]+)\s*[^<]*<\/coordinates>/i) ||
      matchFirst(body, /<coordinates>\s*([\s\S]*?)<\/coordinates>/i)?.trim() ||
      ""
    out.push({ name, description, coordinates })
  }
  return out
}

function parseCoordinates(raw: string): { lat: number; lng: number } | null {
  const first = raw.trim().split(/\s+/)[0] || ""
  const parts = first.split(",")
  if (parts.length < 2) return null
  const lng = Number(parts[0])
  const lat = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

function extractDescriptionFields(html: string) {
  const text = htmlToPlain(html)
  return {
    comercioTipo: fieldValue(text, "Tipo de comercio"),
    modalidad: fieldValue(text, "Modalidad"),
    materiaPrima: fieldValue(text, "Materia prima"),
    cocina:
      fieldValue(text, "Nivel de cuidados") ||
      fieldValue(text, "Cocina") ||
      undefined,
  }
}

function fieldValue(text: string, label: string): string | undefined {
  const re = new RegExp(
    `-\\s*${escapeRegExp(label)}\\s*:\\s*([^\\n\\r]+)`,
    "i"
  )
  const m = text.match(re)
  const value = m?.[1]?.trim()
  return value || undefined
}

function htmlToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
}

function extractOpeningHours(html: string): string | undefined {
  const text = htmlToPlain(html)
  const idx = text.search(/-?\s*Horarios?\s+de\s+atenci[oó]n\s*:/i)
  if (idx < 0) return undefined
  let rest = text.slice(idx).replace(/^-?\s*Horarios?\s+de\s+atenci[oó]n\s*:\s*/i, "")
  // corta en Instagram / Nombre / WhatsApp / etc.
  rest = rest.split(/\n(?=Instagram:|WhatsApp:|Tel[eé]fono:|Nombre:|Web:)/i)[0] || rest
  const lines = rest
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return undefined
  return lines.join("\n")
}

function extractInstagram(html: string): string | undefined {
  const text = htmlToPlain(html)
  const m = text.match(/Instagram:\s*@?([A-Za-z0-9._]+)/i)
  if (!m?.[1]) return undefined
  return `@${m[1].replace(/^@/, "")}`
}

function modalidadHasDelivery(modalidad?: string): boolean {
  if (!modalidad) return false
  const n = normalize(modalidad)
  return (
    n.includes("delivery") ||
    n.includes("envio por app") ||
    n.includes("envios por app") ||
    n.includes("rappi") ||
    n.includes("pedidosya")
  )
}

export function mapComercioToType(comercioTipo?: string): PlaceType {
  const n = normalize(comercioTipo || "")
  if (!n) return "other"

  if (n.includes("helader")) return "icecream"
  if (n.includes("cervecer") || (n.includes("bar") && !n.includes("restobar"))) {
    if (n.includes("hamburg") || n.includes("restaur")) return "restaurant"
    return "bar"
  }
  if (n.includes("panader") || n.includes("pasteler") || n.includes("churrer")) {
    return "bakery"
  }
  if (
    n.includes("despacho") ||
    n.includes("tienda") ||
    n.includes("almacen") ||
    n.includes("productos 100") ||
    n.includes("fabrica de pastas")
  ) {
    return "store"
  }
  if (n.includes("cafeter") || n.includes("cafe ")) return "cafe"
  if (
    n.includes("restaur") ||
    n.includes("pizzer") ||
    n.includes("hamburg") ||
    n.includes("bodegon") ||
    n.includes("parilla") ||
    n.includes("parrilla") ||
    n.includes("restobar") ||
    n.includes("sandwicher") ||
    n.includes("rotiser")
  ) {
    return "restaurant"
  }
  return "other"
}

export function mapSafetyAndTags(
  cocina?: string,
  materiaPrima?: string
): { tags: string[]; safetyLevel?: SafetyLevel } {
  const tags = new Set<string>()
  let safetyLevel: SafetyLevel | undefined

  const cocinaN = normalize(cocina || "")
  const materiaN = normalize(materiaPrima || "")

  const isDedicated =
    cocinaN.includes("100% libre de gluten") ||
    cocinaN.includes("100 libre de gluten") ||
    cocinaN.includes("cocina 100%")

  const isMixedCare =
    cocinaN.includes("mixta") ||
    cocinaN.includes("contaminacion cruzada") ||
    cocinaN.includes("horno de uso exclusivo") ||
    cocinaN.includes("se sirve cerrado")

  if (isDedicated) {
    tags.add("100_gf")
    safetyLevel = "dedicated_gf"
  } else if (isMixedCare) {
    tags.add("opciones_sin_tacc")
    safetyLevel = "gf_options"
  } else if (cocinaN) {
    tags.add("opciones_sin_tacc")
    safetyLevel = "unknown"
  }

  if (
    materiaN.includes("certificada sin tacc") ||
    materiaN.includes("certificada sin gluten") ||
    materiaN.includes("certificados sin gluten")
  ) {
    tags.add("certificado_sin_tacc")
    // no subir a dedicated_gf solo por materia prima (puede ser cocina mixta)
  }

  if (tags.size === 0) {
    tags.add("sin_info")
    safetyLevel = "unknown"
  }

  return { tags: [...tags], safetyLevel }
}

function geographyFromFolder(folder: string): {
  neighborhood: string
  province?: string
  locality?: string
} {
  const n = normalize(folder)
  if (n.includes("ciudad de buenos aires") || n === "caba") {
    return {
      neighborhood: "CABA",
      province: "caba",
      locality: "buenos-aires",
    }
  }
  if (n.includes("provincia de buenos aires") || n === "amba") {
    return {
      neighborhood: "Buenos Aires",
      province: "buenos-aires",
      locality: undefined,
    }
  }
  if (n.includes("mar del plata")) {
    return {
      neighborhood: "Mar del Plata",
      province: "buenos-aires",
      locality: "mar-del-plata",
    }
  }
  if (n.includes("pinamar") || n.includes("carilo") || n.includes("ostende") || n.includes("valeria")) {
    return {
      neighborhood: folder.trim() || "Pinamar",
      province: "buenos-aires",
      locality: "pinamar",
    }
  }
  if (n.includes("villa gesell") || n.includes("mar azul") || n.includes("mar de las pampas")) {
    return {
      neighborhood: folder.trim() || "Villa Gesell",
      province: "buenos-aires",
      locality: "villa-gesell",
    }
  }
  if (
    n.includes("mar de ajo") ||
    n.includes("san bernardo") ||
    n.includes("la lucila") ||
    n.includes("aguas verdes") ||
    n.includes("nueva atlantis")
  ) {
    return {
      neighborhood: folder.trim() || "Partido de La Costa",
      province: "buenos-aires",
      locality: "la-costa",
    }
  }
  if (
    n.includes("costa del este") ||
    n.includes("mar del tuyu") ||
    n.includes("teresita") ||
    n.includes("toninas") ||
    n.includes("san clemente")
  ) {
    return {
      neighborhood: folder.trim() || "Partido de La Costa",
      province: "buenos-aires",
      locality: "la-costa",
    }
  }
  if (n.includes("santa clara") || n.includes("mar chiquita")) {
    return {
      neighborhood: folder.trim() || "Mar Chiquita",
      province: "buenos-aires",
      locality: "mar-chiquita",
    }
  }
  // Costa Atlántica / BA genérico
  if (n.includes("costa") || n.includes("atlant")) {
    return {
      neighborhood: folder.trim() || "Costa Atlántica",
      province: "buenos-aires",
    }
  }
  return {
    neighborhood: folder.trim() || "Otro",
    province: "buenos-aires",
  }
}

/** Si la description no trae campos estructurados, infiere tags desde texto libre. */
export function inferTagsFromFreeText(descriptionHtml: string): {
  tags: string[]
  safetyLevel?: SafetyLevel
} {
  const text = normalize(htmlToPlain(descriptionHtml))
  if (!text) return { tags: ["sin_info"], safetyLevel: "unknown" }

  const tags = new Set<string>()
  let safetyLevel: SafetyLevel | undefined

  if (
    text.includes("100% libre de gluten") ||
    text.includes("100 libre de gluten") ||
    text.includes("cocina 100%") ||
    text.includes("100% sin gluten") ||
    text.includes("100% sin tacc")
  ) {
    tags.add("100_gf")
    safetyLevel = "dedicated_gf"
  } else if (
    text.includes("sin tacc") ||
    text.includes("sin gluten") ||
    text.includes("celiac") ||
    text.includes("opciones sin")
  ) {
    tags.add("opciones_sin_tacc")
    safetyLevel = "gf_options"
  }

  if (
    text.includes("certificada sin tacc") ||
    text.includes("certificada sin gluten") ||
    text.includes("certificado sin tacc") ||
    text.includes("certificado sin gluten")
  ) {
    tags.add("certificado_sin_tacc")
  }

  if (tags.size === 0) {
    tags.add("sin_info")
    safetyLevel = "unknown"
  }

  return { tags: [...tags], safetyLevel }
}

export function inferTypeFromFreeText(
  name: string,
  descriptionHtml: string,
  comercioTipo?: string
): PlaceType {
  if (comercioTipo) return mapComercioToType(comercioTipo)
  const blob = normalize(`${name} ${htmlToPlain(descriptionHtml)}`)
  if (blob.includes("helader")) return "icecream"
  if (blob.includes("panader") || blob.includes("pasteler") || blob.includes("churrer")) {
    return "bakery"
  }
  if (blob.includes("cafeter") || blob.includes("cafe") || blob.includes("coffee")) {
    return "cafe"
  }
  if (blob.includes("cervecer") || (/\bbar\b/.test(blob) && !blob.includes("restobar"))) {
    return "bar"
  }
  if (
    blob.includes("restaur") ||
    blob.includes("pizzer") ||
    blob.includes("hamburg") ||
    blob.includes("parrilla") ||
    blob.includes("parilla") ||
    blob.includes("bodegon") ||
    blob.includes("restobar")
  ) {
    return "restaurant"
  }
  if (blob.includes("despacho") || blob.includes("tienda") || blob.includes("fabrica de pastas")) {
    return "store"
  }
  // Mapa gastronómico: default restaurant mejor que other
  return "restaurant"
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
}

/** Limpia nombres con CDATA anidado / saltos raros del KML. */
function cleanPlacemarkName(raw: string): string {
  return decodeXmlText(raw)
    .replace(/<!\[CDATA\[/gi, "")
    .replace(/\]\]>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function matchFirst(text: string, re: RegExp): string | undefined {
  const m = text.match(re)
  return m?.[1]
}
