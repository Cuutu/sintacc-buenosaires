import { z } from "zod"
import type { IPlace } from "@/models/Place"

const PLACE_TYPE_VALUES = [
  "restaurant",
  "cafe",
  "bakery",
  "store",
  "icecream",
  "bar",
  "other",
] as const

const PLACE_TYPE_ENUM = z.enum(PLACE_TYPE_VALUES)
const SAFETY_LEVEL_ENUM = z.enum(["dedicated_gf", "gf_options"])

function isPlaceholderValue(value: unknown): boolean {
  if (value == null) return true
  const s = String(value).trim()
  return !s || s.includes("A completar") || s === "(vacío)"
}

function optionalResearchString() {
  return z.preprocess(
    (value) => (isPlaceholderValue(value) ? undefined : value),
    z.string().optional()
  )
}

function optionalResearchPlaceType() {
  return z.preprocess((value) => {
    if (isPlaceholderValue(value)) return undefined
    const parsed = PLACE_TYPE_ENUM.safeParse(value)
    return parsed.success ? parsed.data : undefined
  }, PLACE_TYPE_ENUM.optional())
}

function optionalResearchSafetyLevel() {
  return z.preprocess((value) => {
    if (value == null) return undefined
    const parsed = SAFETY_LEVEL_ENUM.safeParse(value)
    return parsed.success ? parsed.data : undefined
  }, SAFETY_LEVEL_ENUM.optional())
}

function optionalResearchContact() {
  return z.preprocess((value) => {
    if (value == null || typeof value !== "object") return undefined
    const contact = value as Record<string, unknown>
    const cleaned = {
      instagram: isPlaceholderValue(contact.instagram) ? undefined : String(contact.instagram),
      url: isPlaceholderValue(contact.url) ? undefined : String(contact.url),
      phone: isPlaceholderValue(contact.phone) ? undefined : String(contact.phone),
    }
    return Object.values(cleaned).some(Boolean) ? cleaned : undefined
  }, z
    .object({
      instagram: z.string().optional(),
      url: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional())
}

export const aiResearchEvidenceSchema = z.object({
  source: z.enum(["google", "website", "user_link", "reviews"]),
  quote: z.string(),
  url: z.string().optional(),
})

export const aiResearchSuggestedFieldsSchema = z.object({
  name: optionalResearchString(),
  address: optionalResearchString(),
  neighborhood: optionalResearchString(),
  type: optionalResearchPlaceType(),
  openingHours: optionalResearchString(),
  contact: optionalResearchContact(),
  safetyLevel: optionalResearchSafetyLevel(),
})

export type AiResearchEvidence = z.infer<typeof aiResearchEvidenceSchema>
export type AiResearchSuggestedFields = z.infer<typeof aiResearchSuggestedFieldsSchema>

export type AiResearchAnalysis = {
  matchConfidence: number
  gfConfidence: number
  recommendedSafetyLevel: z.infer<typeof SAFETY_LEVEL_ENUM> | null
  recommendedType?: z.infer<typeof PLACE_TYPE_ENUM> | null
  summary: string
  evidence: AiResearchEvidence[]
  needsAdmin: boolean
  suggestedFields?: AiResearchSuggestedFields
}

export const aiResearchAnalysisSchema = z
  .object({
    matchConfidence: z.number().min(0).max(100),
    gfConfidence: z.number().min(0).max(100),
    recommendedSafetyLevel: SAFETY_LEVEL_ENUM.nullable(),
    recommendedType: PLACE_TYPE_ENUM.nullable().optional(),
    summary: z.string(),
    evidence: z.array(aiResearchEvidenceSchema),
    needsAdmin: z.boolean(),
    suggestedFields: z.unknown().optional(),
  })
  .transform((data): AiResearchAnalysis => {
    let suggestedFields: AiResearchSuggestedFields | undefined
    if (data.suggestedFields != null) {
      const parsed = aiResearchSuggestedFieldsSchema.safeParse(data.suggestedFields)
      suggestedFields = parsed.success ? parsed.data : undefined
    }

    return {
      matchConfidence: data.matchConfidence,
      gfConfidence: data.gfConfidence,
      recommendedSafetyLevel: data.recommendedSafetyLevel,
      recommendedType: data.recommendedType,
      summary: data.summary,
      evidence: data.evidence,
      needsAdmin: data.needsAdmin,
      suggestedFields,
    }
  })

export type AiResearchStatus = "pending" | "running" | "done" | "failed"

export const RESEARCH_STALE_MS = 90_000

export type AiResearch = {
  status: AiResearchStatus
  startedAt?: Date
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
