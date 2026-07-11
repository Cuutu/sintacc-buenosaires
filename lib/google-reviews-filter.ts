import { z } from "zod"
import { openRouterChatJson } from "@/lib/openrouter/chat"
import type { GoogleGlutenRelevantReview, GoogleSnapshotReview } from "@/models/Place"

const filterSchema = z.object({
  relevantIndexes: z.array(z.number().int().min(0)).default([]),
  scores: z.array(z.number().min(0).max(100)).default([]),
})

const SYSTEM_PROMPT = `Sos auditor de reseñas de Google para Celimap (app de lugares sin gluten en Argentina).
Tu trabajo: indicar cuáles reseñas mencionan sin TACC, celíaco, gluten free, sin gluten, apto celíaco, contaminación cruzada o cocina dedicada.
NO inventes ni reescribas reseñas. Solo clasificá.
Respondé únicamente JSON válido.`

/** Lugar marcado 100% sin gluten (selector admin / tags). */
export function isDedicatedGlutenFreePlace(place: {
  name?: string | null
  safetyLevel?: string | null
  tags?: string[] | null
  aiEnrichment?: { recommendedSafetyLevel?: string | null } | null
}): boolean {
  if (place.safetyLevel === "dedicated_gf") return true
  if (place.aiEnrichment?.recommendedSafetyLevel === "dedicated_gf") return true

  const tags = place.tags ?? []
  if (tags.includes("100_gf") || tags.includes("certificado_sin_tacc")) return true

  return false
}

function allReviewsAsRelevant(
  reviews: GoogleSnapshotReview[]
): GoogleGlutenRelevantReview[] {
  return reviews.map((r) => ({ ...r, relevanceScore: 100 }))
}

export async function filterGlutenRelevantGoogleReviews(input: {
  placeName: string
  reviews: GoogleSnapshotReview[]
  /** Si el lugar es 100% GF, todas las reseñas son relevantes */
  isDedicatedGf?: boolean
}): Promise<{
  glutenRelevant: GoogleGlutenRelevantReview[]
}> {
  if (input.reviews.length === 0) {
    return { glutenRelevant: [] }
  }

  // Lugar full GF: no hace falta que la reseña diga "sin TACC"
  if (input.isDedicatedGf) {
    return { glutenRelevant: allReviewsAsRelevant(input.reviews) }
  }

  const numbered = input.reviews
    .map((r, i) => `${i}. (${r.rating ?? "?"}★) ${r.text.slice(0, 500)}`)
    .join("\n\n")

  try {
    const { data } = await openRouterChatJson({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Lugar: ${input.placeName}\n\nReseñas Google:\n${numbered}\n\nJSON: { "relevantIndexes": number[], "scores": number[] (mismo orden que indexes, 0-100) }`,
        },
      ],
      schema: filterSchema,
      timeoutMs: 20_000,
    })

    const glutenRelevant: GoogleGlutenRelevantReview[] = []
    for (let i = 0; i < data.relevantIndexes.length; i++) {
      const idx = data.relevantIndexes[i]
      const review = input.reviews[idx]
      if (!review) continue
      glutenRelevant.push({
        ...review,
        relevanceScore: data.scores[i] ?? 50,
      })
    }

    glutenRelevant.sort((a, b) => b.relevanceScore - a.relevanceScore)

    return { glutenRelevant }
  } catch {
    const keywords =
      /sin\s*tacc|cel[ií]ac|gluten\s*free|sin\s*gluten|apto\s*cel|contaminaci[oó]n|cocina\s*separad|100\s*%\s*sin/i
    const glutenRelevant = input.reviews
      .filter((r) => keywords.test(r.text))
      .map((r) => ({ ...r, relevanceScore: 60 }))
    return { glutenRelevant }
  }
}
