import { z } from "zod"
import {
  ventureCategoryIds,
  ventureModalityIds,
  ventureSafetyLevelIds,
} from "@/lib/venture-constants"

export const placeSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  type: z.enum(["restaurant", "cafe", "bakery", "store", "icecream", "bar", "other"]),
  types: z.array(z.enum(["restaurant", "cafe", "bakery", "store", "icecream", "bar", "other"])).min(1).optional(),
  address: z.string().min(1).max(500).trim(),
  neighborhood: z.string().min(1).max(100).trim(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  addressText: z.string().max(500).optional(),
  locationPrecision: z.enum(["exact", "approx"]).optional(),
  userProvidedNeighborhood: z.string().max(100).optional(),
  userProvidedReference: z.string().max(200).optional(),
  tags: z.array(z.string()).default([]),
  contact: z
    .object({
      instagram: z.string().optional(),
      whatsapp: z.string().optional(),
      phone: z.string().optional(),
      url: z.preprocess((val) => (val === "" ? undefined : val), z.string().url().optional()),
    })
    .optional(),
  openingHours: z.string().max(500).optional(),
  delivery: z.object({
    available: z.boolean().optional(),
    rappi: z.string().optional(),
    pedidosya: z.string().optional(),
    other: z.string().optional(),
  }).optional(),
  photos: z.array(z.string().url()).max(3).default([]),
  status: z.enum(["approved", "pending"]).optional(),
  source: z.enum(["excel", "kml", "suggestion", "manual"]).optional(),
  safetyLevel: z
    .enum(["dedicated_gf", "gf_options", "cross_contamination_risk", "unknown"])
    .optional(),
})

export const contaminationReportSchema = z.object({
  placeId: z.string().min(1),
  comment: z.string().min(10, "Contá tu experiencia en al menos 10 caracteres").max(1000).trim(),
})

export const reviewSchema = z.object({
  placeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  safeFeeling: z.boolean(),
  separateKitchen: z.enum(["yes", "no", "unknown"]),
  comment: z.string().min(1).max(800).trim(),
  // Fase 2
  contaminationIncident: z.boolean().optional(),
  visitDate: z.string().datetime().optional(),
  evidencePhotos: z.array(z.string().url()).max(3).optional(),
})

export const suggestionSchema = placeSchema.extend({
  // Same as place but without status
})

/** Para que el admin edite el placeDraft antes de aprobar (todos los campos opcionales) */
export const placeDraftUpdateSchema = placeSchema.partial()

const INSTAGRAM_REGEX = /instagram\.com|instagr\.am/
const GOOGLE_MAPS_REGEX = /google\.com\/maps|goo\.gl\/maps|maps\.google|maps\.app\.goo\.gl/

export const quickSuggestionSchema = z.object({
  sourceLink: z
    .string()
    .min(1, "Agregá el link de Instagram o Google Maps")
    .refine(
      (val) => INSTAGRAM_REGEX.test(val) || GOOGLE_MAPS_REGEX.test(val),
      "El link debe ser de Instagram o Google Maps"
    ),
  safetyLevel: z.enum(["dedicated_gf", "gf_options"], {
    required_error: "Indicá si es 100% apto o tiene opciones",
  }),
  name: z.string().max(200).trim().optional(),
})

const placeTypeValues = [
  "restaurant",
  "cafe",
  "bakery",
  "store",
  "icecream",
  "bar",
  "other",
] as const

const safetyLevelValues = [
  "dedicated_gf",
  "gf_options",
  "cross_contamination_risk",
  "unknown",
] as const

export const publicPlacesQuerySchema = z.object({
  search: z.string().optional(),
  type: z.enum(placeTypeValues).optional(),
  neighborhood: z.string().optional(),
  citySlugs: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  safetyLevel: z.enum(safetyLevelValues).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.preprocess(
    (value) => {
      const n = Number(value)
      if (!Number.isFinite(n)) return 20
      return Math.min(100, Math.max(1, Math.trunc(n)))
    },
    z.number().int().min(1).max(100)
  ).default(20),
})

export type PublicPlacesQuery = z.infer<typeof publicPlacesQuerySchema>

export function parsePublicPlacesSearchParams(
  searchParams: URLSearchParams
): PublicPlacesQuery {
  return publicPlacesQuerySchema.parse({
    search: searchParams.get("search") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    neighborhood: searchParams.get("neighborhood") ?? undefined,
    citySlugs: searchParams.get("citySlugs")?.split(",").filter(Boolean),
    tags: searchParams.get("tags")?.split(",").filter(Boolean),
    safetyLevel: searchParams.get("safetyLevel") ?? undefined,
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "20",
  })
}

export function isQuickSuggestion(body: unknown): body is z.infer<typeof quickSuggestionSchema> {
  return typeof body === "object" && body !== null && "sourceLink" in body && "safetyLevel" in body
}

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}

const ventureCategoryEnum = z.enum(ventureCategoryIds as unknown as [string, ...string[]])
const ventureModalityEnum = z.enum(ventureModalityIds as unknown as [string, ...string[]])
const ventureSafetyEnum = z.enum(ventureSafetyLevelIds as unknown as [string, ...string[]])

export const ventureSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  slug: z.string().min(2).max(120).optional(),
  category: ventureCategoryEnum,
  zone: z.string().min(1).max(150).trim(),
  modalities: z.array(ventureModalityEnum).default([]),
  safetyLevel: ventureSafetyEnum.default("to_confirm"),
  contact: z
    .object({
      instagram: z.string().max(500).optional(),
      whatsapp: z.string().max(50).optional(),
    })
    .optional(),
  certifiedProducts: z.boolean().optional(),
  purchaseChannels: z.string().max(1000).optional(),
  description: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(3).default([]),
  status: z.enum(["approved", "pending"]).optional(),
  source: z.enum(["suggestion", "manual"]).optional(),
})

export const ventureSuggestionSchema = ventureSchema.extend({
  suggesterComment: z.string().max(1500).optional(),
  shipsNationwide: z.boolean().optional(),
})

export const ventureDraftUpdateSchema = ventureSchema.partial()

export const venturesPublicQuerySchema = z.object({
  category: ventureCategoryEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.preprocess(
    (value) => {
      const n = Number(value)
      if (!Number.isFinite(n)) return 20
      return Math.min(100, Math.max(1, Math.trunc(n)))
    },
    z.number().int().min(1).max(100)
  ).default(20),
})

export type VenturesPublicQuery = z.infer<typeof venturesPublicQuerySchema>

export const ventureReviewSchema = z.object({
  ventureId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(800).trim(),
})

export function parseVenturesSearchParams(
  searchParams: URLSearchParams
): VenturesPublicQuery {
  return venturesPublicQuerySchema.parse({
    category: searchParams.get("category") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "20",
  })
}
