/**
 * Dry-run import KML Sintaccto AMBA → Celimap.
 * NO escribe DB. Parse + (opcional) reverse-geocode + dedupe.
 *
 * Uso:
 *   npm run kml:dry-run
 *   npm run kml:dry-run -- --geocode
 *   npm run kml:dry-run -- --geocode --force-geocode
 */
import dns from "dns"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { enrichDraftsWithGeocode } from "../lib/kml-sintacc/geocode-cache"
import { parseSintaccAmbaKml } from "../lib/kml-sintacc/parse"
import type { KmlPlaceDraft } from "../lib/kml-sintacc/types"
import {
  findDuplicateCandidates,
  getDuplicateMatchLevel,
  type DuplicateDraft,
} from "../lib/place-duplicates"

dns.setServers(["8.8.8.8", "1.1.1.1"])
dns.setDefaultResultOrder("ipv4first")

/** Likely lejos sin contacto compartido = otra sucursal, no dupe. */
const FAR_LIKELY_METERS = 500
/** Nuevo pero hay lugar DB a ≤ esta distancia → posible mismo local. */
const NEAR_EXISTING_METERS = 80

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

type MatchKind = "exact" | "likely" | "other_branch" | "near_existing" | "nuevo"

type MatchRow = {
  kmlName: string
  folder: string
  type: string
  address?: string
  neighborhood?: string
  tags: string[]
  safetyLevel?: string
  hasInstagram: boolean
  hasHours: boolean
  matchKind: MatchKind
  score?: number
  reasons?: string[]
  distanceMeters?: number
  nearestDistanceMeters?: number
  nearestName?: string
  existing?: {
    id: string
    name: string
    neighborhood?: string
    address?: string
    status?: string
  }
  enrichHints: string[]
}

function draftToDuplicate(draft: KmlPlaceDraft): DuplicateDraft {
  return {
    name: draft.name,
    type: draft.type,
    address: draft.address,
    addressText: draft.addressText || draft.address,
    neighborhood: draft.neighborhood,
    location: draft.location,
    contact: draft.contact,
  }
}

function enrichHints(
  draft: KmlPlaceDraft,
  existing: {
    tags?: string[]
    safetyLevel?: string
    openingHours?: string
    contact?: { instagram?: string }
    delivery?: { available?: boolean }
  } | null
): string[] {
  if (!existing) return []
  const hints: string[] = []
  const existingTags = new Set(existing.tags ?? [])
  for (const tag of draft.tags) {
    if (!existingTags.has(tag)) hints.push(`tag:+${tag}`)
  }
  if (draft.safetyLevel && !existing.safetyLevel) {
    hints.push(`safetyLevel:${draft.safetyLevel}`)
  }
  if (draft.openingHours && !existing.openingHours) {
    hints.push("openingHours")
  }
  if (draft.contact?.instagram && !existing.contact?.instagram) {
    hints.push(`instagram:${draft.contact.instagram}`)
  }
  if (draft.delivery?.available && !existing.delivery?.available) {
    hints.push("delivery")
  }
  return hints
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

function findNearest(
  draft: KmlPlaceDraft,
  places: Array<{
    name?: string
    location?: { lat?: number; lng?: number }
  }>
): { name: string; distanceMeters: number } | null {
  let best: { name: string; distanceMeters: number } | null = null
  for (const place of places) {
    const lat = place.location?.lat
    const lng = place.location?.lng
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const distanceMeters = haversineMeters(draft.location, {
      lat: lat as number,
      lng: lng as number,
    })
    if (!best || distanceMeters < best.distanceMeters) {
      best = { name: place.name || "Sin nombre", distanceMeters }
    }
  }
  return best
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const NAME_STOPWORDS = new Set([
  "cafe",
  "cafeteria",
  "bar",
  "resto",
  "restaurant",
  "restaurante",
  "pizzeria",
  "panaderia",
  "bakery",
  "gluten",
  "free",
  "sintacc",
  "sin",
  "tacc",
  "delivery",
  "take",
  "away",
  "palermo",
  "recoleta",
  "belgrano",
  "caballito",
  "urquiza",
  "devoto",
  "nunez",
  "nuñez",
  "madero",
  "puerto",
  "centro",
  "microcentro",
  "colegiales",
  "villa",
  "norte",
  "sur",
  "oeste",
  "hollywood",
  "hollywood",
])

/** Evita “Café Martínez cerca de Fry Brothers” solo por densidád. */
function namesProbablySame(a: string, b: string): boolean {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (na.length < 4 || nb.length < 4) return false
  if (na === nb) return true
  const ca = na.replace(/\s+/g, "")
  const cb = nb.replace(/\s+/g, "")
  if (ca.length >= 5 && cb.length >= 5 && (ca.includes(cb) || cb.includes(ca))) {
    return true
  }
  const tokensA = [...new Set(na.split(" ").filter((t) => t.length >= 4 && !NAME_STOPWORDS.has(t)))]
  const tokensB = [...new Set(nb.split(" ").filter((t) => t.length >= 4 && !NAME_STOPWORDS.has(t)))]
  if (tokensA.length === 0 || tokensB.length === 0) return false
  const setA = new Set(tokensA)
  const overlap = tokensB.filter((t) => setA.has(t)).length
  return overlap >= 1
}

function classifyMatch(opts: {
  matchLevel: "exact" | "likely" | null
  reasons?: string[]
  distanceMeters?: number
  nearestDistanceMeters?: number
  kmlName?: string
  nearestName?: string
}): MatchKind {
  const {
    matchLevel,
    reasons = [],
    distanceMeters,
    nearestDistanceMeters,
    kmlName,
    nearestName,
  } = opts

  if (matchLevel === "exact") return "exact"

  if (matchLevel === "likely") {
    const sharedContact = reasons.some(
      (r) => r === "mismo instagram" || r === "mismo link"
    )
    const far =
      distanceMeters != null && distanceMeters > FAR_LIKELY_METERS && !sharedContact
    if (far) return "other_branch"
    return "likely"
  }

  if (
    nearestDistanceMeters != null &&
    nearestDistanceMeters <= NEAR_EXISTING_METERS &&
    kmlName &&
    nearestName &&
    namesProbablySame(kmlName, nearestName)
  ) {
    return "near_existing"
  }

  return "nuevo"
}

async function main() {
  loadEnvFiles()

  const wantGeocode = hasFlag("--geocode")
  const forceGeocode = hasFlag("--force-geocode")
  const kmlPath = resolve(
    process.cwd(),
    argValue("--kml") || "data/mapa-amba-sintaccto.kml"
  )
  if (!existsSync(kmlPath)) {
    throw new Error(`No existe KML: ${kmlPath}`)
  }

  console.log("=== KML import dry-run v2 (no escribe DB) ===")
  console.log(`KML: ${kmlPath}`)
  console.log(`Geocode: ${wantGeocode ? (forceGeocode ? "force" : "on") : "off"}`)

  const xml = readFileSync(kmlPath, "utf8")
  const parsed = parseSintaccAmbaKml(xml)
  console.log(`Fuente: ${parsed.sourceName}`)
  console.log(`Folders: ${parsed.folders.join(" | ")}`)
  console.log(`Placemarks parseados: ${parsed.places.length}`)
  if (parsed.warnings.length) {
    console.log(`Warnings parse: ${parsed.warnings.length}`)
    for (const w of parsed.warnings.slice(0, 10)) console.log(`  - ${w}`)
    if (parsed.warnings.length > 10) console.log(`  ... +${parsed.warnings.length - 10}`)
  }

  let geocodeStats = {
    geocoded: 0,
    failed: 0,
    fromCache: 0,
    withAddress: 0,
  }

  if (wantGeocode) {
    const mapboxLen = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim().length ?? 0
    const googleKey = Boolean(
      process.env.GOOGLE_MAPS_API_KEY?.trim() ||
        process.env.GOOGLE_PLACES_API_KEY?.trim()
    )
    console.log(
      `\nReverse-geocode… (mapboxTokenLen=${mapboxLen}, googleKey=${googleKey})`
    )
    if (mapboxLen > 0 && mapboxLen < 40) {
      console.log(
        "⚠ NEXT_PUBLIC_MAPBOX_TOKEN parece truncado (<40 chars). Uso Google si hay key."
      )
    }

    const result = await enrichDraftsWithGeocode(parsed.places, {
      force: forceGeocode,
      concurrency: 4,
      onProgress: (done, total) => {
        if (done % 50 === 0 || done === total) {
          process.stdout.write(`\r  geocode ${done}/${total}`)
        }
      },
    })
    process.stdout.write("\n")
    geocodeStats = {
      geocoded: result.geocoded,
      failed: result.failed,
      fromCache: result.fromCache,
      withAddress: parsed.places.filter(
        (p) => p.address && p.address !== "A completar"
      ).length,
    }
    console.log(
      `Geocode: +${geocodeStats.geocoded} api, ${geocodeStats.fromCache} cache, ${geocodeStats.failed} fail, ${geocodeStats.withAddress} con address`
    )
  }

  const byType = countBy(parsed.places.map((p) => p.type))
  const bySafety = countBy(parsed.places.map((p) => p.safetyLevel || "∅"))
  const byFolder = countBy(parsed.places.map((p) => p.folder))
  const withIg = parsed.places.filter((p) => p.contact?.instagram).length
  const withHours = parsed.places.filter((p) => p.openingHours).length
  const withDelivery = parsed.places.filter((p) => p.delivery?.available).length
  const withRealAddress = parsed.places.filter(
    (p) => p.address && p.address !== "A completar"
  ).length

  console.log("\nPor carpeta:")
  for (const [k, n] of Object.entries(byFolder).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}\t${k}`)
  }
  console.log("\nPor type:")
  for (const [k, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}\t${k}`)
  }
  console.log("\nPor safetyLevel:")
  for (const [k, n] of Object.entries(bySafety).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}\t${k}`)
  }
  console.log(`\nCon Instagram: ${withIg}`)
  console.log(`Con horarios: ${withHours}`)
  console.log(`Con delivery flag: ${withDelivery}`)
  console.log(`Con address real: ${withRealAddress}`)

  const rows: MatchRow[] = []
  const counts: Record<MatchKind, number> = {
    exact: 0,
    likely: 0,
    other_branch: 0,
    near_existing: 0,
    nuevo: 0,
  }
  let enrichable = 0
  let dbCount = 0
  let mongoUsed = false
  let addressMatchHits = 0

  if (process.env.MONGODB_URI) {
    mongoUsed = true
    const { default: connectDB } = await import("../lib/mongodb")
    const { Place } = await import("../models/Place")
    await connectDB()

    const places = await Place.find(
      {},
      {
        name: 1,
        type: 1,
        types: 1,
        address: 1,
        addressText: 1,
        neighborhood: 1,
        location: 1,
        contact: 1,
        tags: 1,
        safetyLevel: 1,
        openingHours: 1,
        delivery: 1,
        status: 1,
      }
    )
      .limit(8000)
      .lean()

    dbCount = places.length
    console.log(`\nMongo: ${dbCount} places (approved+pending+otros)`)

    const candidates = places.map((place) => ({
      ...place,
      kind: "place" as const,
    }))

    const existingById = new Map(
      places.map((p) => [String(p._id), p as Record<string, unknown>])
    )

    for (const draft of parsed.places) {
      const matches = findDuplicateCandidates(draftToDuplicate(draft), candidates, {
        threshold: 50,
        limit: 1,
      })
      const top = matches[0]
      const matchLevel = top
        ? getDuplicateMatchLevel(top.reasons, top.score)
        : null

      if (top?.reasons?.some((r) => r.includes("direccion"))) {
        addressMatchHits += 1
      }

      const nearest = findNearest(draft, places)
      const matchKind = classifyMatch({
        matchLevel,
        reasons: top?.reasons,
        distanceMeters: top?.distanceMeters,
        nearestDistanceMeters: nearest?.distanceMeters,
        kmlName: draft.name,
        nearestName: nearest?.name,
      })

      const existingDoc =
        matchKind === "exact" || matchKind === "likely"
          ? top
            ? existingById.get(top.id)
            : null
          : null

      const hints = enrichHints(
        draft,
        existingDoc
          ? {
              tags: existingDoc.tags as string[] | undefined,
              safetyLevel: existingDoc.safetyLevel as string | undefined,
              openingHours: existingDoc.openingHours as string | undefined,
              contact: existingDoc.contact as { instagram?: string } | undefined,
              delivery: existingDoc.delivery as { available?: boolean } | undefined,
            }
          : null
      )

      counts[matchKind] += 1
      if (hints.length) enrichable += 1

      rows.push({
        kmlName: draft.name,
        folder: draft.folder,
        type: draft.type,
        address: draft.address !== "A completar" ? draft.address : undefined,
        neighborhood: draft.neighborhood,
        tags: draft.tags,
        safetyLevel: draft.safetyLevel,
        hasInstagram: Boolean(draft.contact?.instagram),
        hasHours: Boolean(draft.openingHours),
        matchKind,
        score: top?.score,
        reasons: top?.reasons,
        distanceMeters: top?.distanceMeters,
        nearestDistanceMeters: nearest?.distanceMeters,
        nearestName: nearest?.name,
        existing: top
          ? {
              id: top.id,
              name: top.name,
              neighborhood: top.neighborhood,
              address: top.address,
              status: top.status,
            }
          : undefined,
        enrichHints: hints,
      })
    }
  } else {
    console.log(
      "\n⚠ Sin MONGODB_URI — solo stats de parse/geocode. Para dedupe poné URI en .env.local"
    )
    for (const draft of parsed.places) {
      rows.push({
        kmlName: draft.name,
        folder: draft.folder,
        type: draft.type,
        address: draft.address !== "A completar" ? draft.address : undefined,
        neighborhood: draft.neighborhood,
        tags: draft.tags,
        safetyLevel: draft.safetyLevel,
        hasInstagram: Boolean(draft.contact?.instagram),
        hasHours: Boolean(draft.openingHours),
        matchKind: "nuevo",
        enrichHints: [],
      })
      counts.nuevo += 1
    }
  }

  console.log("\n=== Resultado dry-run v2 ===")
  console.log(`Mongo usado: ${mongoUsed}`)
  console.log(`Exact dupes: ${counts.exact}`)
  console.log(`Likely dupes (cerca/contacto): ${counts.likely}`)
  console.log(`Other branch (mismo nombre lejos): ${counts.other_branch}`)
  console.log(
    `Near existing (≤${NEAR_EXISTING_METERS}m, nombre distinto): ${counts.near_existing}`
  )
  console.log(`Nuevos reales: ${counts.nuevo}`)
  console.log(`Hits con razón dirección: ${addressMatchHits}`)
  console.log(`Match con campos para enriquecer: ${enrichable}`)

  const sampleNuevos = rows.filter((r) => r.matchKind === "nuevo").slice(0, 12)
  const sampleNear = rows.filter((r) => r.matchKind === "near_existing").slice(0, 10)
  const sampleExact = rows.filter((r) => r.matchKind === "exact").slice(0, 8)
  const sampleAddr = rows
    .filter((r) => r.reasons?.some((x) => x.includes("direccion")))
    .slice(0, 8)
  const sampleBranch = rows.filter((r) => r.matchKind === "other_branch").slice(0, 8)

  if (sampleExact.length) {
    console.log("\nSample EXACT:")
    for (const r of sampleExact) {
      console.log(
        `  = ${r.kmlName} ↔ ${r.existing?.name} (${r.score}) ${r.reasons?.join(", ")}` +
          (r.distanceMeters != null ? ` · ${Math.round(r.distanceMeters)}m` : "")
      )
    }
  }
  if (sampleAddr.length) {
    console.log("\nSample MATCH POR DIRECCIÓN:")
    for (const r of sampleAddr) {
      console.log(
        `  # ${r.kmlName} ↔ ${r.existing?.name} | ${r.address || "¿?"} ↔ ${r.existing?.address || "¿?"} (${r.reasons?.join(", ")})`
      )
    }
  }
  if (sampleNear.length) {
    console.log("\nSample NEAR EXISTING (revisar):")
    for (const r of sampleNear) {
      console.log(
        `  ≈ ${r.kmlName} cerca de ${r.nearestName} · ${Math.round(r.nearestDistanceMeters || 0)}m` +
          (r.address ? ` | ${r.address}` : "")
      )
    }
  }
  if (sampleBranch.length) {
    console.log("\nSample OTHER BRANCH:")
    for (const r of sampleBranch) {
      console.log(
        `  ≠ ${r.kmlName} ↔ ${r.existing?.name} · ${Math.round(r.distanceMeters || 0)}m`
      )
    }
  }
  if (sampleNuevos.length) {
    console.log("\nSample NUEVOS:")
    for (const r of sampleNuevos) {
      console.log(
        `  + ${r.kmlName} (${r.type}) [${r.tags.join(",")}]` +
          (r.address ? ` | ${r.address}` : "") +
          (r.nearestDistanceMeters != null
            ? ` · nearest ${Math.round(r.nearestDistanceMeters)}m`
            : "")
      )
    }
  }

  const outDir = resolve(process.cwd(), "data")
  mkdirSync(outDir, { recursive: true })
  const reportPath = resolve(outDir, "kml-dry-run-report.json")
  const report = {
    generatedAt: new Date().toISOString(),
    version: 2,
    kmlPath,
    sourceName: parsed.sourceName,
    mongoUsed,
    dbCount,
    geocode: wantGeocode ? geocodeStats : null,
    totals: {
      parsed: parsed.places.length,
      ...counts,
      enrichable,
      addressMatchHits,
      withInstagram: withIg,
      withHours,
      withDelivery,
      withRealAddress,
    },
    thresholds: {
      farLikelyMeters: FAR_LIKELY_METERS,
      nearExistingMeters: NEAR_EXISTING_METERS,
    },
    byFolder,
    byType,
    bySafety,
    warnings: parsed.warnings,
    rows,
  }
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8")
  console.log(`\nReporte: ${reportPath}`)
  process.exit(0)
}

function countBy(values: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const v of values) out[v] = (out[v] || 0) + 1
  return out
}

main().catch((err) => {
  console.error("❌ Dry-run falló:", err)
  process.exit(1)
})
