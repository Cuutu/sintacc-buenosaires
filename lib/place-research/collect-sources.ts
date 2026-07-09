import type { GooglePlaceEnriched } from "@/lib/google-places-enriched"
import { fetchGoogleGlutenContextSearch } from "@/lib/google-places-enriched"
import { fetchWebsitePaths } from "@/lib/place-research/fetch-website"
import { isGoogleMapsUrl } from "@/lib/place-research/resolve-maps-url"

export type ResearchSourceBundle = {
  draftSummary: string
  googleSummary: string
  googleAiSummary: string
  websiteTexts: string[]
  userLinks: string[]
  reviewSnippets: string[]
  totalChars: number
}

const MAX_TOTAL_CHARS = 16_000

function clip(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function buildGoogleAiSummary(
  googlePlace: GooglePlaceEnriched,
  supplemental?: { overview?: string; description?: string } | null
): string {
  const parts: string[] = []

  if (googlePlace.generativeOverview) {
    parts.push(`Resumen Gemini (overview): ${googlePlace.generativeOverview}`)
  }
  if (googlePlace.generativeDescription) {
    parts.push(`Resumen Gemini (detalle): ${googlePlace.generativeDescription}`)
  }
  if (googlePlace.reviewSummaryText) {
    parts.push(`Resumen de reseñas Google: ${googlePlace.reviewSummaryText}`)
  }
  if (googlePlace.editorialSummary) {
    parts.push(`Resumen editorial: ${googlePlace.editorialSummary}`)
  }
  if (supplemental?.overview && supplemental.overview !== googlePlace.generativeOverview) {
    parts.push(`Búsqueda sin TACC (overview): ${supplemental.overview}`)
  }
  if (
    supplemental?.description &&
    supplemental.description !== googlePlace.generativeDescription
  ) {
    parts.push(`Búsqueda sin TACC (detalle): ${supplemental.description}`)
  }

  return parts.join("\n\n")
}

export async function collectResearchSources(input: {
  placeDraft: Record<string, unknown>
  googlePlace?: GooglePlaceEnriched | null
  mapsLinkResolved?: boolean
  skipWebsiteFetch?: boolean
}): Promise<ResearchSourceBundle> {
  const { placeDraft, googlePlace, mapsLinkResolved, skipWebsiteFetch } = input
  const contact = (placeDraft.contact as Record<string, string> | undefined) ?? {}

  const draftSummary = [
    `Nombre sugerido: ${placeDraft.name ?? "(vacío)"}`,
    `Dirección: ${placeDraft.address ?? "(vacío)"}`,
    `Barrio: ${placeDraft.neighborhood ?? "(vacío)"}`,
    `Tipo: ${placeDraft.type ?? "(vacío)"}`,
    `Nivel seguridad usuario: ${placeDraft.safetyLevel ?? "(no indicado)"}`,
    contact.instagram ? `Instagram usuario: ${contact.instagram}` : null,
    contact.url ? `Link usuario: ${contact.url}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  const supplementalGoogle = googlePlace
    ? await fetchGoogleGlutenContextSearch({
        name: googlePlace.name ?? String(placeDraft.name ?? ""),
        address: googlePlace.address,
        lat: googlePlace.lat,
        lng: googlePlace.lng,
      })
    : null

  const googleAiSummary = googlePlace
    ? buildGoogleAiSummary(googlePlace, supplementalGoogle)
    : supplementalGoogle?.overview
      ? `Búsqueda sin TACC: ${supplementalGoogle.overview}`
      : ""

  const googleSummary = googlePlace
    ? [
        `Google placeId: ${googlePlace.placeId}`,
        `Nombre Google: ${googlePlace.name ?? ""}`,
        `Dirección Google: ${googlePlace.address}`,
        `Barrio Google: ${googlePlace.neighborhood ?? ""}`,
        `Tipo Google: ${googlePlace.primaryType ?? ""}`,
        `Web: ${googlePlace.websiteUri ?? ""}`,
        `Tel: ${googlePlace.phone ?? ""}`,
        `Maps: ${googlePlace.googleMapsUri ?? ""}`,
        `Rating: ${googlePlace.rating ?? ""} (${googlePlace.userRatingCount ?? 0} reseñas)`,
        googlePlace.openingHoursText
          ? `Horarios: ${googlePlace.openingHoursText}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Sin match en Google Places."

  const userLinks: string[] = []
  if (contact.instagram) userLinks.push(`Instagram (declarado por usuario): ${contact.instagram}`)
  if (contact.url) {
    userLinks.push(`Link (declarado por usuario): ${contact.url}`)
    if (mapsLinkResolved && googlePlace?.name) {
      userLinks.push(`Link Google Maps resuelto al lugar: ${googlePlace.name}`)
    }
  }

  const websiteTexts: string[] = []
  if (!skipWebsiteFetch) {
    if (googlePlace?.websiteUri) {
      const pages = await fetchWebsitePaths(googlePlace.websiteUri)
      websiteTexts.push(...pages)
    }
    if (
      contact.url &&
      !/instagram\.com|instagr\.am/i.test(contact.url) &&
      !isGoogleMapsUrl(contact.url)
    ) {
      const pages = await fetchWebsitePaths(contact.url)
      websiteTexts.push(...pages)
    }
  }

  const reviewSnippets = googlePlace?.reviewSnippets ?? []

  let totalChars =
    draftSummary.length +
    googleSummary.length +
    googleAiSummary.length +
    userLinks.join("\n").length +
    websiteTexts.join("\n").length +
    reviewSnippets.join("\n").length

  const clippedWebsite = websiteTexts.map((t) => {
    if (totalChars <= MAX_TOTAL_CHARS) return t
    const clipped = clip(t, 2500)
    totalChars = MAX_TOTAL_CHARS
    return clipped
  })

  return {
    draftSummary: clip(draftSummary, 1500),
    googleSummary: clip(googleSummary, 2500),
    googleAiSummary: clip(googleAiSummary, 4000),
    websiteTexts: clippedWebsite,
    userLinks,
    reviewSnippets: reviewSnippets.map((r) => clip(r, 700)),
    totalChars: Math.min(totalChars, MAX_TOTAL_CHARS),
  }
}

export function buildResearchUserPrompt(bundle: ResearchSourceBundle): string {
  return [
    "Analizá si hay evidencia de opciones sin gluten o local 100% sin TACC.",
    "Buscá en TODAS las fuentes: resúmenes IA de Google, reseñas, web y menús.",
    "Palabras clave: sin TACC, celíaco, celiacos, gluten free, sin gluten, apto celíaco.",
    "",
    "=== BORRADOR USUARIO ===",
    bundle.draftSummary,
    "",
    "=== GOOGLE PLACES (datos) ===",
    bundle.googleSummary,
    "",
    "=== RESÚMENES IA GOOGLE / GEMINI (prioridad alta para TACC) ===",
    bundle.googleAiSummary || "(no disponible — revisá reseñas y web)",
    "",
    "=== LINKS USUARIO (no scrapear IG, solo contexto) ===",
    bundle.userLinks.length ? bundle.userLinks.join("\n") : "(ninguno)",
    "",
    "=== RESEÑAS GOOGLE (texto completo disponible) ===",
    bundle.reviewSnippets.length
      ? bundle.reviewSnippets.map((r, i) => `${i + 1}. ${r}`).join("\n\n")
      : "(ninguna)",
    "",
    "=== TEXTO WEB PÚBLICO (carta, menú, nosotros) ===",
    bundle.websiteTexts.length ? bundle.websiteTexts.join("\n\n") : "(no disponible)",
    "",
    "Respondé SOLO JSON con este shape:",
    `{
  "matchConfidence": 0-100,
  "gfConfidence": 0-100,
  "recommendedSafetyLevel": "dedicated_gf" | "gf_options" | null,
  "recommendedType": "restaurant"|"cafe"|"bakery"|"store"|"icecream"|"bar"|"other"|null,
  "summary": "párrafo en español para el admin",
  "evidence": [{ "source": "google"|"website"|"user_link"|"reviews", "quote": "cita literal", "url": "opcional" }],
  "needsAdmin": true|false,
  "suggestedFields": { "name", "address", "neighborhood", "type", "openingHours", "contact", "safetyLevel" opcionales }
}`,
    "",
    "Reglas:",
    "- Nunca inventes citas: evidence.quote debe ser substring del material provisto.",
    "- Si el resumen IA de Google menciona opciones sin TACC / celíacos → gf_options y gfConfidence >= 70.",
    "- Si dice 100% sin TACC o dedicado celíacos → dedicated_gf.",
    "- dedicated_gf solo con evidencia fuerte (100% sin gluten / sin TACC / celíaco dedicado).",
    "- gf_options si menciona opciones sin TACC pero no dedicado.",
    "- needsAdmin=true si falta info, match bajo, o gfConfidence < 60.",
    "- Si no hay evidencia GF en ninguna fuente, gfConfidence bajo y recommendedSafetyLevel null.",
    "- En suggestedFields: omití campos desconocidos; no uses null ni 'A completar'.",
    "- Si recomendás gf_options o dedicated_gf, incluí safetyLevel en suggestedFields.",
  ].join("\n")
}
