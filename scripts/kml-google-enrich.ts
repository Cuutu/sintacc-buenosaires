/**
 * Google Places lookup para places pending source=kml.
 * Completa googlePlaceId, address, phone, url, horarios (solo si vacío / mejor).
 *
 * Uso:
 *   npx tsx scripts/kml-google-enrich.ts              # dry-run 20
 *   npx tsx scripts/kml-google-enrich.ts --write       # todos
 *   npx tsx scripts/kml-google-enrich.ts --write --limit 50
 */
import dns from "dns"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import {
  fetchGooglePlaceEnriched,
  searchGooglePlaceByText,
} from "../lib/google-places-enriched"
import { getGoogleMapsApiKey } from "../lib/google-places"
import { haversineMeters } from "../lib/kml-sintacc/match"

dns.setServers(["8.8.8.8", "1.1.1.1"])
dns.setDefaultResultOrder("ipv4first")

const MAX_DISTANCE_METERS = 250
const DELAY_MS = 120

function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const full = resolve(process.cwd(), file)
    if (!existsSync(full)) continue
    const raw = readFileSync(full, "utf8")
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  }
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx < 0) return undefined
  return process.argv[idx + 1]
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function isWeakAddress(value?: string | null): boolean {
  if (!value?.trim()) return true
  const n = value.trim().toLowerCase()
  return (
    n === "a completar" ||
    n.startsWith("ubicacion seleccionada") ||
    n === "sin direccion" ||
    n.startsWith("cerca de ")
  )
}

type Row = {
  id: string
  name: string
  action: "updated" | "skip" | "not_found" | "far" | "error"
  googlePlaceId?: string
  distanceMeters?: number
  addressBefore?: string
  addressAfter?: string
  fields?: string[]
  error?: string
}

async function main() {
  loadEnvFiles()
  const write = hasFlag("--write")
  const limit = Number(argValue("--limit") || (write ? "0" : "20"))
  const onlyMissingId = hasFlag("--only-missing-id")

  const apiKey = getGoogleMapsApiKey()
  if (!apiKey || apiKey.length < 30 || apiKey.startsWith("tu-")) {
    throw new Error(
      "GOOGLE_MAPS_API_KEY inválida/placeholder. Pegá key real con Places API (New) enabled."
    )
  }

  const { default: connectDB } = await import("../lib/mongodb")
  const { Place } = await import("../models/Place")
  await connectDB()

  const filter: Record<string, unknown> = {
    source: "kml",
    status: "pending",
  }
  if (onlyMissingId) {
    filter.$or = [
      { googlePlaceId: { $exists: false } },
      { googlePlaceId: null },
      { googlePlaceId: "" },
    ]
  }

  let query = Place.find(filter).sort({ createdAt: 1 })
  if (limit > 0) query = query.limit(limit)

  const places = await query.lean()
  console.log(
    `=== KML Google enrich ${write ? "WRITE" : "DRY-RUN"} ===`
  )
  console.log(`Places: ${places.length}${limit > 0 ? ` (limit ${limit})` : ""}`)

  // smoke test
  const smoke = await searchGooglePlaceByText("Café Martínez Buenos Aires", {
    lat: -34.59,
    lng: -58.4,
    radius: 5000,
  })
  if (!smoke?.placeId) {
    throw new Error(
      "Places API searchText falló (key sin permiso o API no habilitada)."
    )
  }
  console.log(`Smoke OK: ${smoke.name || smoke.placeId}`)

  const rows: Row[] = []
  let updated = 0
  let notFound = 0
  let far = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < places.length; i++) {
    const place = places[i]
    const id = String(place._id)
    const progress = `${i + 1}/${places.length}`

    try {
      let googlePlaceId = place.googlePlaceId?.trim() || ""

      if (!googlePlaceId) {
        const queryText = [place.name, place.address, place.neighborhood]
          .map((p) => String(p ?? "").trim())
          .filter((p) => p && !p.toLowerCase().includes("a completar"))
          .join(" ")

        const hit = await searchGooglePlaceByText(queryText, {
          lat: place.location?.lat,
          lng: place.location?.lng,
          radius: 600,
        })
        await sleep(DELAY_MS)

        if (!hit?.placeId) {
          notFound += 1
          rows.push({
            id,
            name: place.name,
            action: "not_found",
            addressBefore: place.address,
          })
          if ((i + 1) % 25 === 0) console.log(`  … ${progress}`)
          continue
        }
        googlePlaceId = hit.placeId
      }

      const enriched = await fetchGooglePlaceEnriched(googlePlaceId)
      await sleep(DELAY_MS)

      if (!enriched) {
        notFound += 1
        rows.push({
          id,
          name: place.name,
          action: "not_found",
          googlePlaceId,
          error: "details vacío",
        })
        continue
      }

      const distanceMeters = haversineMeters(
        { lat: place.location.lat, lng: place.location.lng },
        { lat: enriched.lat, lng: enriched.lng }
      )

      if (distanceMeters > MAX_DISTANCE_METERS) {
        far += 1
        rows.push({
          id,
          name: place.name,
          action: "far",
          googlePlaceId,
          distanceMeters: Math.round(distanceMeters),
          addressBefore: place.address,
          addressAfter: enriched.address,
        })
        // igual guardamos googlePlaceId si no había? mejor no si está lejos (match malo)
        continue
      }

      const $set: Record<string, unknown> = {
        googlePlaceId,
      }
      const fields: string[] = ["googlePlaceId"]

      // address: siempre preferir Google si cerca (más canónica)
      if (enriched.address) {
        if (isWeakAddress(place.address) || place.address !== enriched.address) {
          $set.address = enriched.address
          $set.addressText = enriched.address
          fields.push("address")
        }
      }
      if (enriched.neighborhood && place.neighborhood !== enriched.neighborhood) {
        // no pisar barrio bueno con locality genérica demasiado corta? ok si hay
        if (
          isWeakAddress(place.neighborhood) ||
          place.neighborhood === "CABA" ||
          place.neighborhood === "Buenos Aires"
        ) {
          $set.neighborhood = enriched.neighborhood
          fields.push("neighborhood")
        }
      }

      if (enriched.phone && !place.contact?.phone) {
        $set["contact.phone"] = enriched.phone
        fields.push("phone")
      }
      if (enriched.websiteUri && !place.contact?.url) {
        $set["contact.url"] = enriched.websiteUri
        fields.push("url")
      }
      if (enriched.openingHoursText && !place.openingHours) {
        $set.openingHours = enriched.openingHoursText
        fields.push("openingHours")
      }
      if (enriched.googleMapsUri) {
        $set["googleSnapshot.googleMapsUri"] = enriched.googleMapsUri
        $set["googleSnapshot.rating"] = enriched.rating
        $set["googleSnapshot.userRatingCount"] = enriched.userRatingCount
        $set["googleSnapshot.syncedAt"] = new Date()
        fields.push("snapshot")
      }

      if (write) {
        await Place.updateOne({ _id: place._id }, { $set })
      }

      updated += 1
      rows.push({
        id,
        name: place.name,
        action: "updated",
        googlePlaceId,
        distanceMeters: Math.round(distanceMeters),
        addressBefore: place.address,
        addressAfter: enriched.address,
        fields,
      })

      if ((i + 1) % 25 === 0 || i === 0) {
        console.log(
          `  ✓ ${progress} ${place.name} · ${Math.round(distanceMeters)}m · ${fields.join(",")}`
        )
      }
    } catch (err) {
      errors += 1
      const message = err instanceof Error ? err.message : String(err)
      rows.push({
        id,
        name: place.name,
        action: "error",
        error: message,
      })
      console.error(`  ✗ ${progress} ${place.name}: ${message}`)
    }
  }

  const reportPath = resolve(process.cwd(), "data/kml-google-enrich-report.json")
  mkdirSync(resolve(process.cwd(), "data"), { recursive: true })
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        write,
        totals: {
          processed: places.length,
          updated,
          notFound,
          far,
          skipped,
          errors,
        },
        rows,
      },
      null,
      2
    ),
    "utf8"
  )

  console.log("\n=== Resultado ===")
  console.log(`Updated: ${updated}`)
  console.log(`Not found: ${notFound}`)
  console.log(`Far (>${MAX_DISTANCE_METERS}m): ${far}`)
  console.log(`Errors: ${errors}`)
  console.log(`Modo: ${write ? "WRITE" : "DRY-RUN"}`)
  console.log(`Reporte: ${reportPath}`)
  if (!write) {
    console.log("\nPara escribir:")
    console.log("  npx tsx scripts/kml-google-enrich.ts --write")
  }

  process.exit(errors > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("❌ Enrich falló:", err)
  process.exit(1)
})
