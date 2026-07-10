import { z } from "zod"
import { openRouterChatJson } from "@/lib/openrouter/chat"
import type { GoogleGlutenRelevantReview, GoogleSnapshotReview } from "@/models/Place"

const filterSchema = z.object({
  relevantIndexes: z.array(z.number().int().min(0)).default([]),
  scores: z.array(z.number().min(0).max(100)).default([]),
  glutenSignalSummary: z.string().max(280).optional().nullable(),
})

const SYSTEM_PROMPT = `Sos auditor de reseñas de Google para Celimap (app de lugares sin gluten en Argentina).
Tu trabajo: indicar cuáles reseñas mencionan sin TACC, celíaco, gluten free, sin gluten, apto celíaco, contaminación cruzada o cocina dedicada.
NO inventes ni reescribas reseñas. Solo clasificá.
Respondé únicamente JSON válido.`

export async function filterGlutenRelevantGoogleReviews(input: {
  placeName: string
  reviews: GoogleSnapshotReview[]
}): Promise<{
  glutenRelevant: GoogleGlutenRelevantReview[]
  glutenSignalSummary?: string
}> {
  if (input.reviews.length === 0) {
    return { glutenRelevant: [] }
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
          content: `Lugar: ${input.placeName}\n\nReseñas Google:\n${numbered}\n\nJSON: { "relevantIndexes": number[], "scores": number[] (mismo orden que indexes, 0-100), "glutenSignalSummary": "1 frase o null" }`,
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

    return {
      glutenRelevant,
      glutenSignalSummary: data.glutenSignalSummary?.trim() || undefined,
    }
  } catch {
    // Fallback sin IA: keywords locales
    const keywords =
      /sin\s*tacc|cel[ií]ac|gluten\s*free|sin\s*gluten|apto\s*cel|contaminaci[oó]n|cocina\s*separad|100\s*%\s*sin/i
    const glutenRelevant = input.reviews
      .filter((r) => keywords.test(r.text))
      .map((r) => ({ ...r, relevanceScore: 60 }))
    return { glutenRelevant }
  }
}
