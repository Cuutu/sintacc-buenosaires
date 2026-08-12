/**
 * Diagnóstico geográfico read-only de lugares de una ciudad.
 *
 * Uso:
 *   npx tsx scripts/diagnose-city-geo.ts la-plata
 *
 * - No escribe en MongoDB.
 * - No imprime emails, tokens ni documentos completos.
 * - Útil para detectar locality/address/coords inconsistentes (ej. calle "La Plata").
 * - Exit 1 si falla la consulta.
 */

import { getCityBySlug } from "../lib/seo/cities"
import connectDB from "../lib/mongodb"
import { Place } from "../models/Place"

type LeanPlace = {
  _id: { toString(): string }
  slug?: string
  name?: string
  address?: string
  addressText?: string
  province?: string
  locality?: string
  neighborhood?: string
  location?: { lat?: number; lng?: number }
  source?: string
  geoSource?: string
}

function summarizeAddress(p: LeanPlace): string {
  const raw = (p.addressText || p.address || "").trim()
  if (!raw) return "(sin dirección)"
  return raw.length > 90 ? `${raw.slice(0, 87)}...` : raw
}

function addressMentionsOtherLocality(address: string, cityName: string): boolean {
  const a = address.toLowerCase()
  // Heurística suave: "Ingeniero Maschwitz", "Pilar", etc. no son La Plata ciudad
  const foreignHints = [
    "maschwitz",
    "pilar",
    "escobar",
    "tigre",
    "san isidro",
    "vicente lopez",
    "morón",
    "moron",
    "quilmes",
    "avellaneda",
  ]
  if (!a.includes(cityName.toLowerCase()) && foreignHints.some((h) => a.includes(h))) {
    return true
  }
  // "La Plata 1020" como calle + otra localidad en el mismo string
  if (
    cityName.toLowerCase() === "la plata" &&
    /\bla\s*plata\s+\d+/i.test(address) &&
    foreignHints.some((h) => a.includes(h))
  ) {
    return true
  }
  return false
}

async function main() {
  const slug = (process.argv[2] || "la-plata").toLowerCase()
  const city = getCityBySlug(slug)
  if (!city) {
    console.log(`error: ciudad no está en seed: ${slug}`)
    process.exit(1)
  }

  console.log("diagnose-city-geo (read-only)")
  console.log(`city_slug: ${city.slug}`)
  console.log(`city_name: ${city.name}`)
  console.log(`province_slug: ${city.provinceSlug}`)

  await connectDB()
  const places = (await Place.find(
    { status: "approved", province: city.provinceSlug, locality: city.slug },
    {
      _id: 1,
      slug: 1,
      name: 1,
      address: 1,
      addressText: 1,
      province: 1,
      locality: 1,
      neighborhood: 1,
      location: 1,
      source: 1,
    }
  )
    .limit(500)
    .lean()) as LeanPlace[]

  console.log(`total_approved_in_locality: ${places.length}`)
  console.log("---")

  let suspects = 0
  for (const p of places) {
    const address = summarizeAddress(p)
    const lat = p.location?.lat
    const lng = p.location?.lng
    const reasonParts: string[] = [
      `match: province=${p.province} locality=${p.locality}`,
    ]
    const flags: string[] = []
    if (addressMentionsOtherLocality(address, city.name)) {
      flags.push("address_suggests_other_locality")
    }
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      flags.push("missing_coords")
    }

    if (flags.length === 0) continue
    suspects += 1
    console.log("---")
    console.log(`place_id: ${p._id.toString()}`)
    console.log(`slug: ${p.slug ?? "(none)"}`)
    console.log(`name: ${p.name ?? "(none)"}`)
    console.log(`address_summary: ${address}`)
    console.log(`province: ${p.province ?? "(none)"}`)
    console.log(`locality: ${p.locality ?? "(none)"}`)
    console.log(`neighborhood: ${p.neighborhood ?? "(none)"}`)
    console.log(
      `coords: ${lat != null && lng != null ? `${lat},${lng}` : "(none)"}`
    )
    console.log(`geo_source: ${p.source ?? p.geoSource ?? "(unknown)"}`)
    console.log(`inclusion_reason: ${reasonParts.join("; ")}`)
    console.log(`flags: ${flags.join(",")}`)
    console.log(
      "note: no auto-fix; validar locality+coords humanas antes de mover/excluir"
    )
  }

  console.log("---")
  console.log(`suspects_flagged: ${suspects}`)
  console.log("done")
  process.exit(0)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
