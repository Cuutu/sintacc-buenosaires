/**
 * Portada Google → Cloudinary. Solo approved + googlePlaceId + sin foto.
 *
 *   npx tsx scripts/backfill-google-place-photos.ts
 *   npx tsx scripts/backfill-google-place-photos.ts --write
 *   npx tsx scripts/backfill-google-place-photos.ts --write --limit 50
 */
import dns from "dns"
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"
import connectDB from "../lib/mongodb"
import { Place } from "../models/Place"
import { placeNeedsGoogleCoverPhoto, fetchAndStoreGoogleCoverPhoto } from "../lib/google-place-photos"
import { invalidateApiCache } from "../lib/api-cache"

dns.setServers(["8.8.8.8", "1.1.1.1"])
dns.setDefaultResultOrder("ipv4first")

const DELAY_MS = 160
const MAX_CONSECUTIVE_ERRORS = 8
const EMPTY_PHOTOS = {
  $or: [
    { photos: { $exists: false } },
    { photos: { $size: 0 } },
    { "photos.0": { $in: [null, ""] } },
  ],
}

function applyEnvFile(
  file: string,
  opts?: { only?: Set<string>; overwrite?: boolean }
) {
  const full = resolve(process.cwd(), file)
  if (!existsSync(full)) return
  const raw = readFileSync(full, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    if (opts?.only && !opts.only.has(key)) continue
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined || opts?.overwrite) {
      process.env[key] = value
    }
  }
}

function loadEnvFiles() {
  applyEnvFile(".env.local")
  applyEnvFile(".env")
  applyEnvFile(".env.vercel.photos", {
    only: new Set([
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
    ]),
    overwrite: true,
  })
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

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

async function main() {
  loadEnvFiles()
  const write = hasFlag("--write")
  const limitRaw = argValue("--limit")
  const limit = limitRaw ? Math.max(1, Number(limitRaw)) : undefined

  await connectDB()

  const candidates = await Place.find({
    status: "approved",
    googlePlaceId: { $exists: true, $nin: [null, ""] },
    ...EMPTY_PHOTOS,
  })
    .select("_id name googlePlaceId photos")
    .lean()

  const needed = candidates.filter((p) =>
    placeNeedsGoogleCoverPhoto({
      photos: p.photos,
      googlePlaceId: p.googlePlaceId,
    })
  )
  const batch = limit ? needed.slice(0, limit) : needed

  console.log(
    JSON.stringify(
      {
        write,
        candidates: needed.length,
        batch: batch.length,
      },
      null,
      2
    )
  )

  if (!write) {
    console.log("Dry-run. Pasá --write para bajar 1 portada a Cloudinary.")
    process.exit(0)
  }

  let ok = 0
  let noPhoto = 0
  let skipped = 0
  let failed = 0
  let consecutiveErrors = 0

  for (const place of batch) {
    const id = String(place._id)
    try {
      const fresh = await Place.findById(id).select("photos googlePlaceId").lean()
      if (!fresh || !placeNeedsGoogleCoverPhoto(fresh)) {
        skipped += 1
        consecutiveErrors = 0
        continue
      }

      const url = await fetchAndStoreGoogleCoverPhoto(fresh.googlePlaceId!)
      if (!url) {
        noPhoto += 1
        consecutiveErrors = 0
        console.log(`no_photo ${id} ${place.name}`)
        await sleep(DELAY_MS)
        continue
      }

      const updated = await Place.updateOne(
        { _id: id, ...EMPTY_PHOTOS },
        { $set: { photos: [url], photoSource: "google" } }
      )

      if (updated.modifiedCount === 0) {
        skipped += 1
      } else {
        ok += 1
        console.log(`ok ${id} ${place.name}`)
      }
      consecutiveErrors = 0
    } catch (err) {
      failed += 1
      consecutiveErrors += 1
      const message = formatError(err)
      console.error(`error ${id} ${place.name}: ${message}`)
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        throw new Error(`Abort: ${MAX_CONSECUTIVE_ERRORS} errores seguidos. Último: ${message}`)
      }
    }
    await sleep(DELAY_MS)
  }

  try {
    invalidateApiCache(["public:places:"])
  } catch {
    /* revalidateTag no existe fuera de Next */
  }
  console.log(JSON.stringify({ ok, noPhoto, skipped, failed }, null, 2))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
