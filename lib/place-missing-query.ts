/** Cláusulas Mongo compartidas: dashboard counts y filtros de /admin/lugares. */

export const MISSING_PHOTO = {
  $or: [{ photos: { $exists: false } }, { photos: { $size: 0 } }, { "photos.0": { $in: [null, ""] } }],
}

export const MISSING_HOURS = {
  $or: [{ openingHours: { $exists: false } }, { openingHours: { $in: [null, ""] } }],
}

export const MISSING_INSTAGRAM = {
  $or: [
    { contact: { $exists: false } },
    { "contact.instagram": { $exists: false } },
    { "contact.instagram": { $in: [null, ""] } },
  ],
}

export const MISSING_PHONE = {
  $and: [
    {
      $or: [
        { "contact.phone": { $exists: false } },
        { "contact.phone": { $in: [null, ""] } },
      ],
    },
    {
      $or: [
        { "contact.whatsapp": { $exists: false } },
        { "contact.whatsapp": { $in: [null, ""] } },
      ],
    },
  ],
}

export const MISSING_WEB = {
  $or: [
    { contact: { $exists: false } },
    { "contact.url": { $exists: false } },
    { "contact.url": { $in: [null, ""] } },
  ],
}

export const MISSING_DESCRIPTION = {
  $or: [{ description: { $exists: false } }, { description: { $in: [null, ""] } }],
}

export const MISSING_COORDS = {
  $or: [
    { location: { $exists: false } },
    { "location.lat": { $exists: false } },
    { "location.lng": { $exists: false } },
  ],
}

/** Misma definición que placesIncomplete en getAdminCounts. */
export const MISSING_TACC = {
  $and: [
    { safetyLevel: { $nin: ["dedicated_gf", "gf_options"] } },
    { tags: { $nin: ["100_gf", "opciones_sin_tacc"] } },
  ],
}

export const MISSING_ANY_QUALITY = {
  $or: [
    MISSING_PHOTO,
    MISSING_HOURS,
    MISSING_INSTAGRAM,
    MISSING_PHONE,
    MISSING_WEB,
    MISSING_DESCRIPTION,
    MISSING_COORDS,
  ],
}

export type PlaceMissingKey =
  | "photo"
  | "hours"
  | "instagram"
  | "phone"
  | "web"
  | "description"
  | "coords"
  | "incomplete"

export const PLACE_MISSING_CLAUSE: Record<PlaceMissingKey, Record<string, unknown>> = {
  photo: MISSING_PHOTO,
  hours: MISSING_HOURS,
  instagram: MISSING_INSTAGRAM,
  phone: MISSING_PHONE,
  web: MISSING_WEB,
  description: MISSING_DESCRIPTION,
  coords: MISSING_COORDS,
  incomplete: MISSING_TACC,
}

export function parsePlaceMissing(value: string | null): PlaceMissingKey | null {
  if (!value) return null
  return value in PLACE_MISSING_CLAUSE ? (value as PlaceMissingKey) : null
}
