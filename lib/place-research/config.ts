import { isGoogleMapsUrl } from "@/lib/place-research/resolve-maps-url"

export function isPlaceResearchEnabled(): boolean {
  const flag = process.env.PLACE_RESEARCH_ENABLED?.trim().toLowerCase()
  if (flag === "false" || flag === "0") return false
  return Boolean(process.env.OPENROUTER_API_KEY?.trim())
}

export function isPlaceResearchAutoOnSubmit(): boolean {
  const flag = process.env.PLACE_RESEARCH_AUTO_ON_SUBMIT?.trim().toLowerCase()
  if (flag === "false" || flag === "0") return false
  return isPlaceResearchEnabled()
}

/**
 * Auto-research solo si hay Google Maps.
 * Instagram solo → la IA adivina lugar/coords y pifia mucho.
 */
export function shouldAutoResearchSuggestion(placeDraft: {
  contact?: { instagram?: string; url?: string } | null
}): boolean {
  if (!isPlaceResearchAutoOnSubmit()) return false
  const url = placeDraft.contact?.url?.trim() ?? ""
  const ig = placeDraft.contact?.instagram?.trim() ?? ""
  if (url && isGoogleMapsUrl(url)) return true
  if (ig) return false
  return true
}
