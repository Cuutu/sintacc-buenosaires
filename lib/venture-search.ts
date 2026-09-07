import {
  VENTURE_CATEGORIES,
  VENTURE_MODALITIES,
  getCategoryLabel,
  getModalityLabel,
  type VentureCategoryId,
} from "@/lib/venture-constants"

function normalizeQuery(term: string): string {
  return term.trim().toLowerCase()
}

function categoryMatchesQuery(
  category: (typeof VENTURE_CATEGORIES)[number],
  q: string
): boolean {
  const label = category.label.toLowerCase()
  return (
    category.id === q ||
    category.id.startsWith(q) ||
    category.id.includes(q) ||
    label === q ||
    label.startsWith(q) ||
    label.includes(q)
  )
}

/** Categoría única para query corta ("pan" → panificados). Si hay empate, null. */
export function resolveVentureCategoryFromQuery(term: string): VentureCategoryId | null {
  const q = normalizeQuery(term)
  if (q.length < 2) return null

  const matches = VENTURE_CATEGORIES.filter((c) => categoryMatchesQuery(c, q))
  if (matches.length === 1) return matches[0].id

  const exact = matches.find((c) => c.id === q || c.label.toLowerCase() === q)
  return exact?.id ?? null
}

export function getMatchingVentureCategories(term: string): VentureCategoryId[] {
  const q = normalizeQuery(term)
  if (q.length < 2) return []
  return VENTURE_CATEGORIES.filter((c) => categoryMatchesQuery(c, q)).map((c) => c.id)
}

export function buildVentureSearchFilter(term: string): Record<string, unknown> | null {
  const trimmed = term.trim()
  if (trimmed.length < 2) return null

  const regex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
  const lower = trimmed.toLowerCase()

  const categoryIds = VENTURE_CATEGORIES.filter(
    (c) =>
      regex.test(c.label) ||
      regex.test(c.id) ||
      c.label.toLowerCase().includes(lower)
  ).map((c) => c.id)

  const modalityIds = VENTURE_MODALITIES.filter(
    (m) =>
      regex.test(m.label) ||
      regex.test(m.id) ||
      m.label.toLowerCase().includes(lower)
  ).map((m) => m.id)

  const or: Record<string, unknown>[] = [
    { name: regex },
    { zone: regex },
    { description: regex },
    { purchaseChannels: regex },
  ]

  if (categoryIds.length) {
    or.push({ category: { $in: categoryIds } })
  }
  if (modalityIds.length) {
    or.push({ modalities: { $in: modalityIds } })
  }

  return { $or: or }
}

/** Client-side filter when API already returned results (extra modality label match) */
export function matchesVentureSearch(
  venture: {
    name: string
    zone: string
    category: string
    modalities?: string[]
    description?: string
    purchaseChannels?: string
  },
  term: string
): boolean {
  const trimmed = term.trim().toLowerCase()
  if (trimmed.length < 2) return true

  const haystack = [
    venture.name,
    venture.zone,
    getCategoryLabel(venture.category),
    venture.description,
    venture.purchaseChannels,
    ...(venture.modalities ?? []).map(getModalityLabel),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return haystack.includes(trimmed) || trimmed.split(/\s+/).every((w) => haystack.includes(w))
}
