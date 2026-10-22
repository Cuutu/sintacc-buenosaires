import { parseOpeningHours, WEEK_DAYS } from "@/lib/opening-hours"

export type PlaceCompletenessInput = {
  name?: string
  address?: string
  neighborhood?: string
  type?: string
  photos?: string[]
  openingHours?: string
  location?: { lat?: number; lng?: number } | null
  contact?: { instagram?: string; url?: string; phone?: string; whatsapp?: string }
  safetyLevel?: string
  tags?: string[]
  description?: string
  slug?: string
  seo?: { metaTitle?: string; metaDescription?: string; canonical?: string }
}

export type QualityCheckId =
  | "photo"
  | "hours"
  | "instagram"
  | "phone"
  | "description"
  | "coords"
  | "seo"

export type QualityCheck = {
  id: QualityCheckId
  label: string
  ok: boolean
}

/**
 * Hay horarios cargados. Un horario con los 7 días en "Cerrado" (lo que deja el
 * editor si se marcan todos) no cuenta: es lo mismo que no tenerlo.
 */
export function hasUsableOpeningHours(openingHours?: string | null): boolean {
  if (!openingHours?.trim()) return false
  const week = parseOpeningHours(openingHours)
  const allClosed = WEEK_DAYS.every(({ key }) => week[key].explicit && week[key].closed)
  return !allClosed
}

const SCORE_CHECKS: Array<(p: PlaceCompletenessInput) => boolean> = [
  (p) => Boolean(p.photos?.[0]),
  (p) => hasUsableOpeningHours(p.openingHours),
  (p) => Boolean(p.contact?.instagram?.trim()),
  (p) => Boolean(p.contact?.phone?.trim() || p.contact?.whatsapp?.trim()),
  (p) => Boolean(p.description?.trim()),
  (p) => Number.isFinite(p.location?.lat) && Number.isFinite(p.location?.lng),
]

export function placeQualityChecks(place: PlaceCompletenessInput): QualityCheck[] {
  return [
    { id: "photo", label: "Foto", ok: Boolean(place.photos?.[0]) },
    { id: "hours", label: "Horarios", ok: hasUsableOpeningHours(place.openingHours) },
    { id: "instagram", label: "Instagram", ok: Boolean(place.contact?.instagram?.trim()) },
    {
      id: "phone",
      label: "Teléfono",
      ok: Boolean(place.contact?.phone?.trim() || place.contact?.whatsapp?.trim()),
    },
    { id: "description", label: "Descripción", ok: Boolean(place.description?.trim()) },
    {
      id: "coords",
      label: "Coordenadas",
      ok: Number.isFinite(place.location?.lat) && Number.isFinite(place.location?.lng),
    },
    {
      id: "seo",
      label: "SEO",
      ok: Boolean(place.slug?.trim() || place.seo?.metaTitle?.trim()),
    },
  ]
}

export function placeCompleteness(place: PlaceCompletenessInput): number {
  const ok = SCORE_CHECKS.filter((fn) => fn(place)).length
  return Math.round((ok / SCORE_CHECKS.length) * 100)
}

export function completenessTone(pct: number): string {
  if (pct >= 85) return "text-[#2D6A4F]"
  // Ámbar oscuro para texto: #D4A017 sobre crema da 2,3:1 (ilegible); este da 5,7:1.
  if (pct >= 60) return "text-[#8A5A00]"
  return "text-[#B84420]"
}

export function completenessBarTone(pct: number): string {
  if (pct >= 85) return "bg-[#2D6A4F]"
  if (pct >= 60) return "bg-[#D4A017]"
  return "bg-[#B84420]"
}
