import type { IPlace } from "@/models/Place"

export function mergePlaceContactPatch(
  existing: IPlace["contact"] | undefined,
  patch: IPlace["contact"] | undefined
): IPlace["contact"] | undefined {
  if (!patch) return existing
  return { ...(existing ?? {}), ...patch }
}

/** Convierte suggestedDraftPatch en $set para Mongo (merge contact). */
export function buildPlacePatchSet(
  place: Pick<IPlace, "contact">,
  patch: Partial<IPlace>
): Record<string, unknown> {
  const $set: Record<string, unknown> = {}
  const { contact, ...rest } = patch

  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) $set[key] = value
  }

  if (contact) {
    $set.contact = mergePlaceContactPatch(place.contact, contact)
  }

  return $set
}
