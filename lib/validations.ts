import { z } from "zod"

export const placeSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  type: z.enum(["restaurant", "cafe", "bakery", "store", "icecream", "bar", "other"]),
  address: z.string().min(1).max(500).trim(),
  neighborhood: z.string().min(1).max(100).trim(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  tags: z.array(z.string()).default([]),
  contact: z.object({
    instagram: z.string().optional(),
    whatsapp: z.string().optional(),
    phone: z.string().optional(),
    url: z.string().url().optional(),
  }).optional(),
  openingHours: z.string().max(500).optional(),
  delivery: z.object({
    available: z.boolean().optional(),
    rappi: z.string().optional(),
    pedidosya: z.string().optional(),
    other: z.string().optional(),
  }).optional(),
  photos: z.array(z.string().url()).default([]),
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
  evidencePhotos: z.array(z.string().url()).optional(),
})

export const suggestionSchema = placeSchema.extend({
  // Same as place but without status
})

export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
}
