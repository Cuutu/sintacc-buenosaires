import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { getOrSetApiCache } from "@/lib/api-cache"
import { CITIES, getCityBySlug } from "@/lib/seo/cities"

const TTL_MS = 60 * 60 * 1000

/**
 * Cantidad de lugares publicados por ciudad (misma regla que la landing: provincia +
 * localidad), en una sola consulta. Para "Córdoba · 180 lugares" en la home. Se
 * invalida con cualquier escritura de lugares (tag seo:province).
 */
async function loadCityCounts(citySlugs: string[]): Promise<Record<string, number>> {
  const cities = citySlugs
    .map((slug) => getCityBySlug(slug) ?? CITIES.find((c) => c.slug === slug))
    .filter((city): city is NonNullable<typeof city> => Boolean(city))
  if (!cities.length) return {}

  await connectDB()
  const rows = (await Place.aggregate([
    {
      $match: {
        status: "approved",
        $or: cities.map((c) => ({ province: c.provinceSlug, locality: c.slug })),
      },
    },
    { $group: { _id: { province: "$province", locality: "$locality" }, n: { $sum: 1 } } },
  ])) as { _id: { province?: string; locality?: string }; n: number }[]

  const out: Record<string, number> = {}
  for (const city of cities) {
    const row = rows.find((r) => r._id.province === city.provinceSlug && r._id.locality === city.slug)
    if (row) out[city.slug] = row.n
  }
  return out
}

/** {} si Mongo falla: la home se muestra igual, sin cantidades. */
export async function getHomeCityCountsSafe(citySlugs: string[]): Promise<Record<string, number>> {
  try {
    return await getOrSetApiCache(
      `seo:province:home-city-counts:${citySlugs.join(",")}`,
      TTL_MS,
      () => loadCityCounts(citySlugs)
    )
  } catch (error) {
    console.error("[home] getHomeCityCounts failed:", error)
    return {}
  }
}
