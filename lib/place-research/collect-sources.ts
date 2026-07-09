import type { GooglePlaceEnriched } from "@/lib/google-places-enriched"
import { fetchWebsitePaths } from "@/lib/place-research/fetch-website"

export type ResearchSourceBundle = {
  draftSummary: string
  googleSummary: string
  websiteTexts: string[]
  userLinks: string[]
  reviewSnippets: string[]
  totalChars: number
}

const MAX_TOTAL_CHARS = 12_000

function clip(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export async function collectResearchSources(input: {
  placeDraft: Record<string, unknown>
  googlePlace?: GooglePlaceEnriched | null
}): Promise<ResearchSourceBundle> {
  const { placeDraft, googlePlace } = input
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
        googlePlace.editorialSummary
          ? `Resumen editorial: ${googlePlace.editorialSummary}`
          : null,
        googlePlace.openingHoursText
          ? `Horarios: ${googlePlace.openingHoursText}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Sin match en Google Places."

  const userLinks: string[] = []
  if (contact.instagram) userLinks.push(`Instagram (declarado por usuario): ${contact.instagram}`)
  if (contact.url) userLinks.push(`Link (declarado por usuario): ${contact.url}`)

  const websiteTexts: string[] = []
  if (googlePlace?.websiteUri) {
    const pages = await fetchWebsitePaths(googlePlace.websiteUri)
    websiteTexts.push(...pages)
  }

  const reviewSnippets = googlePlace?.reviewSnippets ?? []

  let totalChars =
    draftSummary.length +
    googleSummary.length +
    userLinks.join("\n").length +
    websiteTexts.join("\n").length +
    reviewSnippets.join("\n").length

  const clippedWebsite = websiteTexts.map((t) => {
    if (totalChars <= MAX_TOTAL_CHARS) return t
    const clipped = clip(t, 2000)
    totalChars = MAX_TOTAL_CHARS
    return clipped
  })

  return {
    draftSummary: clip(draftSummary, 1500),
    googleSummary: clip(googleSummary, 2500),
    websiteTexts: clippedWebsite,
    userLinks,
    reviewSnippets: reviewSnippets.map((r) => clip(r, 400)),
    totalChars: Math.min(totalChars, MAX_TOTAL_CHARS),
  }
}

export function buildResearchUserPrompt(bundle: ResearchSourceBundle): string {
  return [
    "Analizá si hay evidencia de opciones sin gluten o local 100% sin TACC.",
    "",
    "=== BORRADOR USUARIO ===",
    bundle.draftSummary,
    "",
    "=== GOOGLE PLACES ===",
    bundle.googleSummary,
    "",
    "=== LINKS USUARIO (no scrapear IG, solo contexto) ===",
    bundle.userLinks.length ? bundle.userLinks.join("\n") : "(ninguno)",
    "",
    "=== RESEÑAS GOOGLE (snippets) ===",
    bundle.reviewSnippets.length
      ? bundle.reviewSnippets.map((r, i) => `${i + 1}. ${r}`).join("\n")
      : "(ninguna)",
    "",
    "=== TEXTO WEB PÚBLICO ===",
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
    "- dedicated_gf solo con evidencia fuerte (100% sin gluten / sin TACC / celíaco dedicado).",
    "- gf_options si menciona opciones sin TACC pero no dedicado.",
    "- needsAdmin=true si falta info, match bajo, o gfConfidence < 60.",
    "- Si no hay evidencia GF, gfConfidence bajo y recommendedSafetyLevel null.",
  ].join("\n")
}
