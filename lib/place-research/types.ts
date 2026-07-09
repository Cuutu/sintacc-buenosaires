import { z } from "zod"
import type { IPlace } from "@/models/Place"

export const aiResearchEvidenceSchema = z.object({
  source: z.enum(["google", "website", "user_link", "reviews"]),
  quote: z.string(),
  url: z.string().optional(),
})

export const aiResearchAnalysisSchema = z.object({
  matchConfidence: z.number().min(0).max(100),
  gfConfidence: z.number().min(0).max(100),
  recommendedSafetyLevel: z.enum(["dedicated_gf", "gf_options"]).nullable(),
  recommendedType: z
    .enum(["restaurant", "cafe", "bakery", "store", "icecream", "bar", "other"])
    .nullable()
    .optional(),
  summary: z.string(),
  evidence: z.array(aiResearchEvidenceSchema),
  needsAdmin: z.boolean(),
  suggestedFields: z
    .object({
      name: z.string().optional(),
      address: z.string().optional(),
      neighborhood: z.string().optional(),
      type: z
        .enum(["restaurant", "cafe", "bakery", "store", "icecream", "bar", "other"])
        .optional(),
      openingHours: z.string().optional(),
      contact: z
        .object({
          instagram: z.string().optional(),
          url: z.string().optional(),
          phone: z.string().optional(),
        })
        .optional(),
      safetyLevel: z.enum(["dedicated_gf", "gf_options"]).optional(),
    })
    .optional(),
})

export type AiResearchEvidence = z.infer<typeof aiResearchEvidenceSchema>
export type AiResearchAnalysis = z.infer<typeof aiResearchAnalysisSchema>

export type AiResearchStatus = "pending" | "running" | "done" | "failed"

export type AiResearch = {
  status: AiResearchStatus
  ranAt?: Date
  googlePlaceId?: string
  matchConfidence?: number
  gfConfidence?: number
  recommendedSafetyLevel?: "dedicated_gf" | "gf_options" | null
  recommendedType?: string
  summary: string
  evidence: AiResearchEvidence[]
  suggestedDraftPatch?: Partial<IPlace>
  needsAdmin: boolean
  error?: string
  costUsd?: number
  model?: string
}
