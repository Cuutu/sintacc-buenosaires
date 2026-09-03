/**
 * Match canónico ficha ↔ ciudad seed.
 * province = city.provinceSlug, locality = city.slug.
 * Sin aliases display, sin neighborhood (Centro se repite entre ciudades).
 */

export function canonicalCityPlaceFilter(city: {
  slug: string
  provinceSlug: string
}): { status: "approved"; province: string; locality: string } {
  return {
    status: "approved",
    province: city.provinceSlug,
    locality: city.slug,
  }
}

export function placeMatchesCanonicalCity(
  place: { province?: string | null; locality?: string | null },
  city: { slug: string; provinceSlug: string }
): boolean {
  return place.province === city.provinceSlug && place.locality === city.slug
}
