import {
  DESTINATION_MAX_LENGTH,
  LIST_LINK_STATUS,
  LIST_VISIBILITY,
  PLACE_NOTE_MAX_LENGTH,
  type ListLinkStatus,
  type ListVisibility,
} from "@/lib/lists/constants"
import { generatePrivateListToken } from "@/lib/lists/private-token"

const OBJECT_ID_RE = /^[a-f\d]{24}$/i

export function isValidObjectIdString(id: unknown): id is string {
  return typeof id === "string" && OBJECT_ID_RE.test(id)
}

export function parseVisibility(
  value: unknown,
  fallback: ListVisibility = LIST_VISIBILITY.PUBLIC
): ListVisibility {
  if (value === LIST_VISIBILITY.PRIVATE_LINK) return LIST_VISIBILITY.PRIVATE_LINK
  if (value === LIST_VISIBILITY.PUBLIC) return LIST_VISIBILITY.PUBLIC
  return fallback
}

/** Devuelve ObjectId strings válidos, preservando orden. */
export function normalizePlaceIdStrings(placeIds: unknown): string[] {
  if (!Array.isArray(placeIds)) return []
  return placeIds.filter(isValidObjectIdString)
}

export function normalizePlaceNotes(
  placeNotes: unknown,
  placeIds: string[]
): Array<{ placeId: string; note: string }> {
  if (!Array.isArray(placeNotes)) return []
  const allowed = new Set(placeIds)
  const byPlace = new Map<string, string>()

  for (const entry of placeNotes) {
    if (!entry || typeof entry !== "object") continue
    const rawPlaceId = (entry as { placeId?: unknown }).placeId
    const placeId =
      typeof rawPlaceId === "string"
        ? rawPlaceId
        : rawPlaceId &&
            typeof (rawPlaceId as { toString?: () => string }).toString ===
              "function"
          ? (rawPlaceId as { toString: () => string }).toString()
          : null
    const note = (entry as { note?: unknown }).note
    if (!isValidObjectIdString(placeId)) continue
    if (!allowed.has(placeId)) continue
    if (typeof note !== "string") continue
    const trimmed = note.trim().slice(0, PLACE_NOTE_MAX_LENGTH)
    if (!trimmed) continue
    byPlace.set(placeId, trimmed)
  }

  return placeIds
    .map((id) => {
      const note = byPlace.get(id)
      return note ? { placeId: id, note } : null
    })
    .filter((x): x is { placeId: string; note: string } => Boolean(x))
}

export function applyVisibilityFields(opts: {
  visibility: ListVisibility
  existingToken?: string | null
  existingStatus?: ListLinkStatus | null
}): {
  visibility: ListVisibility
  isPublic: boolean
  privateAccessToken: string | null
  linkStatus: ListLinkStatus | null
} {
  if (opts.visibility === LIST_VISIBILITY.PRIVATE_LINK) {
    return {
      visibility: LIST_VISIBILITY.PRIVATE_LINK,
      isPublic: false,
      privateAccessToken: opts.existingToken || generatePrivateListToken(),
      linkStatus: opts.existingStatus || LIST_LINK_STATUS.ACTIVE,
    }
  }
  return {
    visibility: LIST_VISIBILITY.PUBLIC,
    isPublic: true,
    privateAccessToken: null,
    linkStatus: null,
  }
}

export function normalizeOptionalText(
  value: unknown,
  max: number
): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim().slice(0, max)
  return trimmed || undefined
}

export function normalizeDestination(value: unknown): string | undefined {
  return normalizeOptionalText(value, DESTINATION_MAX_LENGTH)
}

export function normalizeCoverImage(value: unknown): string | undefined | null {
  if (value === null || value === "") return null
  if (typeof value !== "string") return undefined
  const trimmed = value.trim().slice(0, 500)
  if (!trimmed) return null
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed
  }
  return undefined
}
