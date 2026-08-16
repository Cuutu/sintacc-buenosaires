import type { AdminCounts } from "@/lib/admin-ops"

const QUALITY_FIELDS = 6

export type AttentionTone = "critical" | "warn" | "improve" | "ok"

export type AttentionItem = {
  id: string
  label: string
  count: number
  href: string
  tone: AttentionTone
}

export type PriorityItem = {
  id: string
  level: "alta" | "media"
  title: string
  count: number
  href: string
}

/** Score 0–100 a partir de huecos reales. Null si no hay publicados. */
export function computeBaseQualityScore(counts: {
  placesApproved: number
  placesNoPhoto: number
  placesNoHours: number
  placesNoInstagram: number
  placesNoPhone: number
  placesNoDescription: number
  placesNoCoords: number
}): number | null {
  const approved = counts.placesApproved
  if (approved <= 0) return null
  const missing =
    counts.placesNoPhoto +
    counts.placesNoHours +
    counts.placesNoInstagram +
    counts.placesNoPhone +
    counts.placesNoDescription +
    counts.placesNoCoords
  const filled = approved * QUALITY_FIELDS - missing
  return Math.max(0, Math.min(100, Math.round((filled / (approved * QUALITY_FIELDS)) * 100)))
}

export function qualityScoreExplain(): string {
  return "Promedio de campos cubiertos en lugares publicados: foto, horarios, Instagram, teléfono o WhatsApp, descripción y coordenadas."
}

function toneFor(count: number, criticalAt: number): AttentionTone {
  if (count <= 0) return "ok"
  if (count >= criticalAt) return "critical"
  if (count >= Math.ceil(criticalAt / 3)) return "warn"
  return "improve"
}

export function buildAttentionItems(counts: AdminCounts): AttentionItem[] {
  return [
    {
      id: "instagram",
      label: "lugares sin Instagram",
      count: counts.placesNoInstagram,
      href: "/admin/lugares?missing=instagram&status=approved",
      tone: toneFor(counts.placesNoInstagram, 200),
    },
    {
      id: "hours",
      label: "lugares sin horarios",
      count: counts.placesNoHours,
      href: "/admin/lugares?missing=hours&status=approved",
      tone: toneFor(counts.placesNoHours, 150),
    },
    {
      id: "photo",
      label: "lugares sin foto",
      count: counts.placesNoPhoto,
      href: "/admin/lugares?missing=photo&status=approved",
      tone: toneFor(counts.placesNoPhoto, 80),
    },
    {
      id: "coords",
      label: "lugares sin coordenadas",
      count: counts.placesNoCoords,
      href: "/admin/lugares?missing=coords&status=approved",
      tone: toneFor(counts.placesNoCoords, 20),
    },
    {
      id: "incomplete",
      label: "fichas mínimas",
      count: counts.placesIncomplete,
      href: "/admin/lugares?missing=incomplete&status=approved",
      tone: toneFor(counts.placesIncomplete, 20),
    },
  ]
}

export function buildPriorityItems(
  counts: AdminCounts,
  popular?: { missingHours: number; missingPhoto: number }
): PriorityItem[] {
  const items: PriorityItem[] = []
  if (popular?.missingHours) {
    items.push({
      id: "popular-hours",
      level: "alta",
      title: "Completar horarios en lugares con reseñas de Google",
      count: popular.missingHours,
      href: "/admin/lugares?missing=hours&status=approved&popular=1",
    })
  }
  if (popular?.missingPhoto) {
    items.push({
      id: "popular-photo",
      level: items.length ? "media" : "alta",
      title: "Agregar foto a lugares con reseñas de Google",
      count: popular.missingPhoto,
      href: "/admin/lugares?missing=photo&status=approved&popular=1",
    })
  }

  const volume = [
    { id: "vol-ig", title: "Completar Instagram en lugares publicados", count: counts.placesNoInstagram, href: "/admin/lugares?missing=instagram&status=approved" },
    { id: "vol-hours", title: "Completar horarios en lugares publicados", count: counts.placesNoHours, href: "/admin/lugares?missing=hours&status=approved" },
    { id: "vol-photo", title: "Agregar fotos a lugares publicados", count: counts.placesNoPhoto, href: "/admin/lugares?missing=photo&status=approved" },
    { id: "vol-min", title: "Revisar fichas mínimas sin clasificación TACC", count: counts.placesIncomplete, href: "/admin/lugares?missing=incomplete&status=approved" },
  ]
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)

  for (const row of volume) {
    if (items.some((i) => i.href === row.href)) continue
    items.push({
      id: row.id,
      level: items.length === 0 ? "alta" : "media",
      title: row.title,
      count: row.count,
      href: row.href,
    })
    if (items.length >= 3) break
  }
  return items
}

export function daysSince(iso?: string): number | null {
  if (!iso) return null
  const delta = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(delta) || delta < 0) return null
  return Math.floor(delta / 86400000)
}
