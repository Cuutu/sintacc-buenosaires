import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import type { IPlace } from "@/models/Place"
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
import {
  aiResearchAnalysisSchema,
  RESEARCH_STALE_MS,
  type AiResearch,
  type AiResearchAnalysis,
} from "@/lib/place-research/types"
import { findDuplicateWarningsForDraft } from "@/lib/place-duplicates-loader"
import type { DuplicateDraft } from "@/lib/place-duplicates"
import { isPlaceInformationIncomplete } from "@/lib/place-incomplete"
import { z } from "zod"

const SYSTEM_PROMPT = `Sos auditor de lugares sin gluten para Celimap (Argentina).
Tu trabajo: evaluar TODA la evidencia pública y ayudar al admin humano.
Priorizá resúmenes IA de Google (Gemini), reseñas, carta web y menús.
Buscá menciones de sin TACC, celíaco, gluten free, sin gluten, apto celíaco.
NUNCA apruebes solo: solo recomendá y citá evidencia literal.
Si el resumen de Google dice opciones sin TACC, eso cuenta como evidencia fuerte.
Respondé únicamente JSON válido.`

function placeToDraft(place: IPlace | Record<string, unknown>): Record<string, unknown> {
  return {
    name: place.name,
    type: place.type,
    types: place.types,
    address: place.address,
    neighborhood: place.neighborhood,
    location: place.location,
    contact: place.contact,
    openingHours: place.openingHours,
    safetyLevel: place.safetyLevel,
    photos: place.photos,
  }
}

function buildSearchQuery(draft: Record<string, unknown>): string {
  const contact = (draft.contact as Record<string, string> | undefined) ?? {}
  const parts = [draft.name, draft.address, draft.neighborhood]
    .map((p) => String(p ?? "").trim())
    .filter((p) => p && !p.toLowerCase().includes("a completar"))

  if (contact.url && isGoogleMapsUrl(contact.url)) {
    return parts.join(" ")
  }

  parts.push("Buenos Aires")
  return parts.join(" ")
}

function buildGapFillPatch(input: {
  draft: Record<string, unknown>
  googlePlace: Awaited<ReturnType<typeof fetchGooglePlaceEnriched>>
  analysis: AiResearchAnalysis
}): Partial<IPlace> {
  const { draft, googlePlace, analysis } = input
  const patch: Partial<IPlace> = {}
  const suggested = analysis.suggestedFields ?? {}

  if (googlePlace?.name && (!draft.name || String(draft.name).includes("A completar"))) {
    patch.name = googlePlace.name
  }
  if (googlePlace?.address && isMissingField(draft.address)) {
    patch.address = googlePlace.address
  }
  if (googlePlace?.neighborhood && isMissingField(draft.neighborhood)) {
    patch.neighborhood = googlePlace.neighborhood
  }
  const loc = draft.location as { lat?: number; lng?: number } | undefined
  const hasLocation = Number.isFinite(loc?.lat) && Number.isFinite(loc?.lng)
  if (googlePlace && !hasLocation) {
    patch.location = { lat: googlePlace.lat, lng: googlePlace.lng }
  }

  if (isMissingField(draft.type) || draft.type === "other") {
    if (googlePlace?.primaryType) {
      patch.type = mapGooglePrimaryType(googlePlace.primaryType) as IPlace["type"]
      patch.types = [patch.type]
    } else if (suggested.type) {
      patch.type = suggested.type
      patch.types = [suggested.type]
    } else if (analysis.recommendedType) {
      patch.type = analysis.recommendedType
      patch.types = [analysis.recommendedType]
    }
  }

  if (!draft.openingHours && googlePlace?.openingHoursText) {
    patch.openingHours = googlePlace.openingHoursText
  } else if (!draft.openingHours && suggested.openingHours) {
    patch.openingHours = suggested.openingHours
  }

  const contact = { ...((draft.contact as IPlace["contact"]) ?? {}) }
  let contactChanged = false
  if (!contact.url && googlePlace?.websiteUri) {
    contact.url = googlePlace.websiteUri
    contactChanged = true
  }
  if (!contact.phone && googlePlace?.phone) {
    contact.phone = googlePlace.phone
    contactChanged = true
  }
  if (suggested.contact) {
    if (!contact.url && suggested.contact.url) {
      contact.url = suggested.contact.url
      contactChanged = true
    }
    if (!contact.phone && suggested.contact.phone) {
      contact.phone = suggested.contact.phone
      contactChanged = true
    }
    if (!contact.instagram && suggested.contact.instagram) {
      contact.instagram = suggested.contact.instagram
      contactChanged = true
    }
  }
  if (contactChanged) patch.contact = contact

  if (
    !draft.safetyLevel &&
    analysis.gfConfidence >= 70 &&
    analysis.recommendedSafetyLevel
  ) {
    patch.safetyLevel = analysis.recommendedSafetyLevel
  }

  if (suggested.neighborhood && isMissingField(draft.neighborhood)) {
    patch.neighborhood = suggested.neighborhood
  }

  if (isMissingField(patch.neighborhood ?? draft.neighborhood)) {
    const fallback = inferNeighborhoodFallback(draft, googlePlace)
    if (fallback) patch.neighborhood = fallback
  }

  return patch
}

function inferNeighborhoodFallback(
  draft: Record<string, unknown>,
  googlePlace: Awaited<ReturnType<typeof fetchGooglePlaceEnriched>> | null
): string | undefined {
  const userNb = String(draft.userProvidedNeighborhood ?? "").trim()
  if (userNb) return userNb

  const address = String(googlePlace?.address ?? draft.address ?? "").trim()
  if (!address) return undefined

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length < 2) return undefined

  const candidate = parts[parts.length - 2]
  if (!candidate || /^\d/.test(candidate)) return undefined
  return candidate
}

async function persistPlaceResearchUpdate(
  placeId: string,
  input: {
    aiEnrichment: AiResearch
    patch?: Partial<IPlace>
    existingContact?: IPlace["contact"]
  }
): Promise<void> {
  const $set: Record<string, unknown> = { aiEnrichment: input.aiEnrichment }

  if (input.patch) {
    const { contact, ...rest } = input.patch
    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) $set[key] = value
    }
    if (contact) {
      $set.contact = { ...(input.existingContact ?? {}), ...contact }
    }
  }

  await Place.updateOne({ _id: placeId }, { $set })
}

function isMissingField(value: unknown): boolean {
  if (value == null) return true
  const text = String(value).trim().toLowerCase()
  return !text || text.includes("a completar") || text.includes("sin direccion")
}

function mergePlacePatch(place: Record<string, unknown>, patch: Partial<IPlace>) {
  const merged: Record<string, unknown> = { ...place, ...patch }
  if (patch.contact) {
    merged.contact = {
      ...((place.contact as Record<string, unknown>) ?? {}),
      ...patch.contact,
    }
  }
  return merged
}

function isResearchStale(ai?: AiResearch | null, updatedAt?: Date): boolean {
  if (ai?.status !== "running") return false
  const started = ai.startedAt ?? updatedAt
  if (!started) return true
  return Date.now() - new Date(started).getTime() > RESEARCH_STALE_MS
}

export async function runPlaceResearch(
  placeId: string,
  options?: { lightweight?: boolean; skipRunningMark?: boolean }
): Promise<AiResearch> {
  if (!isPlaceResearchEnabled()) {
    throw new Error("Investigación IA deshabilitada o sin OPENROUTER_API_KEY.")
  }

  await connectDB()
  const place = await Place.findById(placeId)
  if (!place) throw new Error("Lugar no encontrado")

  const existing = place.aiEnrichment
  // Cola ya claim-eó el job (status=running). No salir early: eso deja jobs colgados forever.
  if (
    !options?.skipRunningMark &&
    existing?.status === "running" &&
    !isResearchStale(existing, place.updatedAt)
  ) {
    return existing
  }

  if (!options?.skipRunningMark) {
    const running: AiResearch = {
      status: "running",
      startedAt: new Date(),
      summary: "",
      evidence: [],
      needsAdmin: true,
    }
    await persistPlaceResearchUpdate(place._id.toString(), { aiEnrichment: running })
  }

  try {
    const draft = placeToDraft(place)
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
        const coords = draft.location as { lat?: number; lng?: number } | undefined
        const hit = await searchGooglePlaceByText(
          query,
          Number.isFinite(coords?.lat) && Number.isFinite(coords?.lng)
            ? { lat: coords!.lat, lng: coords!.lng, radius: 400 }
            : undefined
        )
        if (hit?.placeId) {
          googlePlace = await fetchGooglePlaceEnriched(hit.placeId)
          if (googlePlace) matchConfidence = 80
        }
      }
    }

    const bundle = await collectResearchSources({
      placeDraft: draft,
      googlePlace,
      mapsLinkResolved,
      skipWebsiteFetch: options?.lightweight,
    })
    const { data: analysis, cost, model } = await openRouterChatJson({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildResearchUserPrompt(bundle) },
      ],
      schema: aiResearchAnalysisSchema,
      timeoutMs: options?.lightweight ? 20_000 : undefined,
    })

    const suggestedDraftPatch = buildGapFillPatch({
      draft,
      googlePlace,
      analysis: { ...analysis, matchConfidence: analysis.matchConfidence || matchConfidence },
    })

    const draftAutoFilled = Object.keys(suggestedDraftPatch).length > 0
    const nextDraft = draftAutoFilled ? mergePlacePatch(draft, suggestedDraftPatch) : draft

    const mergedPlace = draftAutoFilled ? { ...place.toObject(), ...nextDraft } : place.toObject()

    const duplicateWarnings = await findDuplicateWarningsForDraft(
      nextDraft as DuplicateDraft
    )

    const needsAdmin =
      analysis.needsAdmin ||
      isPlaceInformationIncomplete(mergedPlace as IPlace) ||
      analysis.gfConfidence < 60 ||
      analysis.matchConfidence < 50 ||
      !googlePlace ||
      duplicateWarnings.some((warning) => warning.matchLevel === "exact")

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
      draftAutoFilled,
      duplicateWarnings: duplicateWarnings.length ? duplicateWarnings : undefined,
      needsAdmin,
      costUsd: cost,
      model,
    }

    await persistPlaceResearchUpdate(place._id.toString(), {
      aiEnrichment: result,
      patch: draftAutoFilled ? suggestedDraftPatch : undefined,
      existingContact: place.contact,
    })
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
    await persistPlaceResearchUpdate(place._id.toString(), { aiEnrichment: failed })
    return failed
  }
}
