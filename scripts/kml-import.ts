/**
 * Import KML Sintaccto → Celimap.
 * Solo inserta matchKind: nuevo | other_branch como status=pending, source=kml.
 * NO toca exact/likely/near_existing.
 *
 * Uso:
 *   npm run kml:import              # dry-run (no escribe)
 *   npm run kml:import -- --write   # escribe DB
 */
import dns from "dns"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"
import { enrichDraftsWithGeocode } from "../lib/kml-sintacc/geocode-cache"
import {
  classifyDraftAgainstPlaces,
  IMPORTABLE_MATCH_KINDS,
  type MatchKind,
} from "../lib/kml-sintacc/match"
import { parseSintaccAmbaKml } from "../lib/kml-sintacc/parse"
import type { KmlPlaceDraft } from "../lib/kml-sintacc/types"
import { generateUniquePlaceSlug } from "../lib/place-slugs"

dns.setServers(["8.8.8.8", "1.1.1.1"])
dns.setDefaultResultOrder("ipv4first")

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

type ImportRow = {
  name: string
  matchKind: MatchKind
  type: string
  address: string
  neighborhood: string
  action: "insert" | "skip"
  reason?: string
  id?: string
}

async function main() {
  loadEnvFiles()
  const write = hasFlag("--write")
  const kmlPath = resolve(
    process.cwd(),
    argValue("--kml") || "data/mapa-amba-sintaccto.kml"
  )

  if (!existsSync(kmlPath)) throw new Error(`No existe KML: ${kmlPath}`)
  if (!process.env.MONGODB_URI) {
    throw new Error("Falta MONGODB_URI en .env.local")
  }

  console.log(`=== KML import ${write ? "WRITE" : "DRY-RUN (pasá --write)"} ===`)
  console.log(`KML: ${kmlPath}`)

  const xml = readFileSync(kmlPath, "utf8")
  const parsed = parseSintaccAmbaKml(xml)
  console.log(`Parseados: ${parsed.places.length}`)

  const geo = await enrichDraftsWithGeocode(parsed.places, {
    concurrency: 4,
    onProgress: (done, total) => {
      if (done % 100 === 0 || done === total) {
        process.stdout.write(`\r  geocode cache/api ${done}/${total}`)
      }
    },
  })
  process.stdout.write("\n")
  console.log(
    `Geocode: +${geo.geocoded} api, ${geo.fromCache} cache, ${geo.failed} fail`
  )

  const withAddress = parsed.places.filter(
    (p) => p.address && p.address !== "A completar"
  ).length
  if (withAddress < parsed.places.length * 0.9) {
    throw new Error(
      `Solo ${withAddress}/${parsed.places.length} con address. Corré antes: npm run kml:dry-run:geocode`
    )
  }

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
      status: 1,
      source: 1,
    }
  )
    .limit(8000)
    .lean()

  console.log(`Mongo existentes: ${places.length}`)

  const candidates = places.map((place) => ({
    ...place,
    kind: "place" as const,
  }))

  const rows: ImportRow[] = []
  const toInsert: KmlPlaceDraft[] = []
  const kindCounts: Record<string, number> = {}

  for (const draft of parsed.places) {
    const classified = classifyDraftAgainstPlaces(draft, candidates, places)
    kindCounts[classified.matchKind] =
      (kindCounts[classified.matchKind] || 0) + 1

    if (!IMPORTABLE_MATCH_KINDS.includes(classified.matchKind)) {
      rows.push({
        name: draft.name,
        matchKind: classified.matchKind,
        type: draft.type,
        address: draft.address,
        neighborhood: draft.neighborhood,
        action: "skip",
        reason: `match=${classified.matchKind}`,
      })
      continue
    }

    toInsert.push(draft)
    rows.push({
      name: draft.name,
      matchKind: classified.matchKind,
      type: draft.type,
      address: draft.address,
      neighborhood: draft.neighborhood,
      action: "insert",
    })
  }

  console.log("\nClasificación:")
  for (const [k, n] of Object.entries(kindCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}\t${k}`)
  }
  console.log(`\nA insertar (nuevo+other_branch): ${toInsert.length}`)

  let inserted = 0
  let errors = 0

  if (write) {
    for (const draft of toInsert) {
      try {
        const slug = await generateUniquePlaceSlug(draft.name, draft.neighborhood)
        const doc = await Place.create({
          name: draft.name,
          type: draft.type,
          address: draft.address,
          addressText: draft.addressText || draft.address,
          neighborhood: draft.neighborhood,
          province: draft.province,
          locality: draft.locality,
          location: draft.location,
          locationPrecision: "exact",
          tags: draft.tags,
          safetyLevel: draft.safetyLevel,
          openingHours: draft.openingHours,
          contact: draft.contact,
          delivery: draft.delivery,
          photos: [],
          status: "pending",
          source: "kml",
          slug,
        })
        inserted += 1
        const row = rows.find(
          (r) => r.action === "insert" && r.name === draft.name && !r.id
        )
        if (row) row.id = String(doc._id)
        if (inserted % 50 === 0) {
          console.log(`  insertados ${inserted}/${toInsert.length}`)
        }
      } catch (err) {
        errors += 1
        const message = err instanceof Error ? err.message : String(err)
        console.error(`  ✗ ${draft.name}: ${message}`)
        const row = rows.find(
          (r) => r.action === "insert" && r.name === draft.name && !r.id
        )
        if (row) {
          row.action = "skip"
          row.reason = message
        }
      }
    }
  }

  const outDir = resolve(process.cwd(), "data")
  mkdirSync(outDir, { recursive: true })
  const reportPath = resolve(outDir, "kml-import-report.json")
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        write,
        kindCounts,
        toInsert: toInsert.length,
        inserted,
        errors,
        rows,
      },
      null,
      2
    ),
    "utf8"
  )

  console.log("\n=== Resultado ===")
  console.log(`Modo: ${write ? "WRITE" : "DRY-RUN"}`)
  console.log(`Candidatos: ${toInsert.length}`)
  if (write) {
    console.log(`Insertados pending: ${inserted}`)
    console.log(`Errores: ${errors}`)
  } else {
    console.log("Nada escrito. Para importar:")
    console.log("  npm run kml:import -- --write")
  }
  console.log(`Reporte: ${reportPath}`)

  if (write && inserted > 0) {
    console.log(
      `\nListos en admin como pending (source=kml). Revisá y aprobá cuando quieras.`
    )
  }

  process.exit(errors > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error("❌ Import falló:", err)
  process.exit(1)
})
