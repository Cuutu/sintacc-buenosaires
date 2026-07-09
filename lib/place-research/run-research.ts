import connectDB from "@/lib/mongodb"
import { Suggestion } from "@/models/Suggestion"
import { openRouterChatJson } from "@/lib/openrouter/chat"
import {
  fetchGooglePlaceEnriched,
  findGooglePlaceFromMapsUrl,
  mapGooglePrimaryType,
  searchGooglePlaceByText,
} from "@/lib/google-places-enriched"
import { getGoogleMapsApiKey } from "@/lib/google-places"
import {
  buildResearchUserPrompt,
  collectResearchSources,
} from "@/lib/place-research/collect-sources"
import { isGoogleMapsUrl } from "@/lib/place-research/resolve-maps-url"
import { isPlaceResearchEnabled } from "@/lib/place-research/config"
import { logApiError } from "@/lib/logger"
import {
  aiResearchAnalysisSchema,
  RESEARCH_STALE_MS,
  type AiResearch,
  type AiResearchAnalysis,
} from "@/lib/place-research/types"
import { waitUntil } from "@vercel/functions"
import { z } from "zod"
import type { IPlace } from "@/models/Place"

const SYSTEM_PROMPT = `Sos auditor de lugares sin gluten para Celimap (Argentina).
Tu trabajo: evaluar evidencia pública y ayudar al admin humano.
NUNCA apruebes solo: solo recomendá y citá evidencia.
Si no hay mención clara de sin gluten / sin TACC / celíaco, gfConfidence debe ser bajo.
Respondé únicamente JSON válido.`

function isDraftIncomplete(draft: Record<string, unknown>): boolean {
  const name = String(draft.name ?? "")
  const address = String(draft.address ?? "")
  const neighborhood = String(draft.neighborhood ?? "")
  return (
    name.includes("A completar") ||
    address.includes("A completar") ||
    neighborhood.includes("A completar") ||
    !name.trim() ||
    !address.trim()
  )
}

function extractInstagramHandle(url: string): string | null {
  const match = url.match(/instagram\.com\/([^/?#]+)/i)
  if (!match) return null
  const handle = match[1].toLowerCase()
  if (["p", "reel", "reels", "stories", "explore"].includes(handle)) return null
  return handle
}

function buildSearchQuery(draft: Record<string, unknown>): string {
  const contact = (draft.contact as Record<string, string> | undefined) ?? {}
  const parts = [draft.name, draft.address, draft.neighborhood]
    .map((p) => String(p ?? "").trim())
    .filter((p) => p && !p.includes("A completar"))

  if (parts.length === 0 || isDraftIncomplete(draft)) {
    const ig = contact.instagram ? extractInstagramHandle(contact.instagram) : null
    if (ig) parts.push(ig.replace(/[._]/g, " "))
    else if (
      contact.url &&
      !/instagram\.com|instagr\.am/i.test(contact.url) &&
      !isGoogleMapsUrl(contact.url)
    ) {
      try {
        const host = new URL(contact.url).hostname.replace(/^www\./, "")
        parts.push(host.split(".")[0])
      } catch {
        // ignore invalid URL
      }
    }
  }

  parts.push("Buenos Aires")
  return parts.join(" ")
}

function isResearchStale(ai?: AiResearch | null, updatedAt?: Date): boolean {
  if (ai?.status !== "running") return false
  const started = ai.startedAt ?? updatedAt
  if (!started) return true
  return Date.now() - new Date(started).getTime() > RESEARCH_STALE_MS
}

function buildSuggestedPatch(input: {
  draft: Record<string, unknown>
  googlePlace: Awaited<ReturnType<typeof fetchGooglePlaceEnriched>>
  analysis: AiResearchAnalysis
}): Partial<IPlace> {
  const { draft, googlePlace, analysis } = input
  const patch: Partial<IPlace> = {}
  const suggested = analysis.suggestedFields ?? {}

  const draftIncomplete = isDraftIncomplete(draft)

  if (draftIncomplete && googlePlace) {
    if (googlePlace.name) patch.name = googlePlace.name
    patch.address = googlePlace.address
    if (googlePlace.neighborhood) patch.neighborhood = googlePlace.neighborhood
    patch.location = { lat: googlePlace.lat, lng: googlePlace.lng }
  }

  if (googlePlace?.primaryType) {
    patch.type = mapGooglePrimaryType(googlePlace.primaryType) as IPlace["type"]
    patch.types = [patch.type]
  } else if (suggested.type) {
    patch.type = suggested.type
    patch.types = [suggested.type]
  }

  if (googlePlace?.openingHoursText && !draft.openingHours) {
    patch.openingHours = googlePlace.openingHoursText
  } else if (suggested.openingHours) {
    patch.openingHours = suggested.openingHours
  }

  const contact: IPlace["contact"] = { ...(draft.contact as IPlace["contact"]) }
  let contactChanged = false
  if (googlePlace?.websiteUri && !contact?.url) {
    contact.url = googlePlace.websiteUri
    contactChanged = true
  }
  if (googlePlace?.phone && !contact?.phone) {
    contact.phone = googlePlace.phone
    contactChanged = true
  }
  if (suggested.contact) {
    if (suggested.contact.url && !contact?.url) {
      contact.url = suggested.contact.url
      contactChanged = true
    }
    if (suggested.contact.phone && !contact?.phone) {
      contact.phone = suggested.contact.phone
      contactChanged = true
    }
    if (suggested.contact.instagram && !contact?.instagram) {
      contact.instagram = suggested.contact.instagram
      contactChanged = true
    }
  }
  if (contactChanged) patch.contact = contact

  if (
    analysis.gfConfidence >= 70 &&
    analysis.recommendedSafetyLevel &&
    !draft.safetyLevel
  ) {
    patch.safetyLevel = analysis.recommendedSafetyLevel
  } else if (
    analysis.gfConfidence >= 70 &&
    analysis.recommendedSafetyLevel &&
    suggested.safetyLevel
  ) {
    patch.safetyLevel = suggested.safetyLevel
  }

  if (suggested.name && draftIncomplete) patch.name = suggested.name
  if (suggested.address && draftIncomplete) patch.address = suggested.address
  if (suggested.neighborhood && draftIncomplete) patch.neighborhood = suggested.neighborhood

  return patch
}

export async function runSuggestionResearch(suggestionId: string): Promise<AiResearch> {
  if (!isPlaceResearchEnabled()) {
    throw new Error("Investigación IA deshabilitada o sin OPENROUTER_API_KEY.")
  }

  await connectDB()
  const suggestion = await Suggestion.findById(suggestionId)
  if (!suggestion) throw new Error("Sugerencia no encontrada")
  if (suggestion.status !== "pending") {
    throw new Error("Solo se investigan sugerencias pendientes.")
  }

  const existing = suggestion.aiResearch
  if (existing?.status === "running" && !isResearchStale(existing, suggestion.updatedAt)) {
    return existing
  }

  const running: AiResearch = {
    status: "running",
    startedAt: new Date(),
    summary: "",
    evidence: [],
    needsAdmin: true,
  }
  suggestion.aiResearch = running
  await suggestion.save()

  try {
    const draft = (suggestion.placeDraft as Record<string, unknown>) || {}
    const contact = (draft.contact as Record<string, string> | undefined) ?? {}
    const userUrl = contact.url?.trim()

    let googlePlace = null
    let matchConfidence = 0
    let mapsLinkResolved = false

    if (getGoogleMapsApiKey()) {
      if (userUrl && isGoogleMapsUrl(userUrl)) {
        googlePlace = await findGooglePlaceFromMapsUrl(userUrl)
        if (googlePlace) {
          mapsLinkResolved = true
          matchConfidence = 92
        }
      }

      if (!googlePlace) {
        const query = buildSearchQuery(draft)
        if (query.length >= 3) {
          const hit = await searchGooglePlaceByText(query)
          if (hit?.placeId) {
            googlePlace = await fetchGooglePlaceEnriched(hit.placeId)
            if (googlePlace) {
              const draftName = String(draft.name ?? "").toLowerCase()
              const googleName = (googlePlace.name ?? "").toLowerCase()
              matchConfidence = draftName.includes("completar")
                ? 75
                : googleName && draftName && googleName.includes(draftName.slice(0, 6))
                  ? 85
                  : 65
            }
          }
        }
      }
    }

    const bundle = await collectResearchSources({
      placeDraft: draft,
      googlePlace,
      mapsLinkResolved,
    })
    const { data: analysis, cost, model } = await openRouterChatJson({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildResearchUserPrompt(bundle) },
      ],
      schema: aiResearchAnalysisSchema,
    })

    const needsAdmin =
      analysis.needsAdmin ||
      isDraftIncomplete(draft) ||
      analysis.gfConfidence < 60 ||
      analysis.matchConfidence < 50 ||
      !googlePlace

    const suggestedDraftPatch = buildSuggestedPatch({
      draft,
      googlePlace,
      analysis: { ...analysis, matchConfidence: analysis.matchConfidence || matchConfidence },
    })

    const result: AiResearch = {
      status: "done",
      ranAt: new Date(),
      googlePlaceId: googlePlace?.placeId,
      matchConfidence: analysis.matchConfidence || matchConfidence,
      gfConfidence: analysis.gfConfidence,
      recommendedSafetyLevel: analysis.recommendedSafetyLevel,
      recommendedType: analysis.recommendedType ?? undefined,
      summary: analysis.summary,
      evidence: analysis.evidence,
      suggestedDraftPatch: Object.keys(suggestedDraftPatch).length
        ? suggestedDraftPatch
        : undefined,
      needsAdmin,
      costUsd: cost,
      model,
    }

    suggestion.aiResearch = result
    await suggestion.save()
    return result
  } catch (err: unknown) {
    const message =
      err instanceof z.ZodError
        ? "La IA devolvió datos inválidos. Reintentá la investigación."
        : err instanceof Error
          ? err.message
          : "Error en investigación"
    const failed: AiResearch = {
      status: "failed",
      ranAt: new Date(),
      summary: "",
      evidence: [],
      needsAdmin: true,
      error: message,
    }
    suggestion.aiResearch = failed
    await suggestion.save()
    return failed
  }
}

/** Dispara investigación sin bloquear respuesta HTTP (waitUntil en Vercel). */
export function triggerSuggestionResearchAsync(suggestionId: string): void {
  if (!isPlaceResearchEnabled()) return
  const task = runSuggestionResearch(suggestionId).catch((err) => {
    logApiError(`triggerSuggestionResearchAsync/${suggestionId}`, err)
  })
  try {
    waitUntil(task)
  } catch {
    void task
  }
}
