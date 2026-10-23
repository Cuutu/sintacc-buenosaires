/**
 * Interruptor de emergencia: cambia las URLs de las fotos guardadas en Mongo
 * de Cloudinary a la copia propia (img.celimap.com.ar) o al revés.
 * Ver docs/RESPALDO-IMAGENES.md.
 *
 * Por defecto es dry-run (sólo cuenta). Escribe sólo con --write.
 *
 *   --a-copia       Cloudinary → copia propia. Sólo cambia URLs cuyo archivo está
 *                   en la carpeta espejo (--dir); las que faltan se informan y
 *                   quedan en Cloudinary.
 *   --a-cloudinary  copia propia → Cloudinary (volver atrás). La URL vuelve a ser
 *                   exactamente la original.
 *
 * Uso en el servidor (las variables están en el env de producción):
 *   cd /srv/celimap/current
 *   set -a; . /srv/celimap/shared/.env.production; set +a
 *   npx tsx scripts/cloudinary-mirror-urls.ts --a-copia             # dry-run
 *   npx tsx scripts/cloudinary-mirror-urls.ts --a-copia --write     # aplica
 *   npx tsx scripts/cloudinary-mirror-urls.ts --a-cloudinary --write
 *
 * Campos: places.photos, ventures.photos, reviews.evidencePhotos, lists.coverImage,
 * users.image. Cada documento se escribe sólo si el campo sigue igual que cuando
 * se leyó. No toca updatedAt ni editLog: es un cambio de dirección, no de contenido.
 * El mapa se actualiza solo en ~15 min y las fichas en ~1 h (caché).
 */
import { existsSync } from "fs"
import path from "path"
import {
  IMAGE_MIRROR_ORIGIN,
  parseCloudinaryOriginal,
  toCloudinaryUrl,
  toMirrorUrl,
} from "../lib/image-mirror"
import { loadEnvFiles } from "./load-env"

const DEFAULT_DIR = "/srv/celimap/shared/img-mirror"

const FIELDS: { collection: string; field: string; array: boolean }[] = [
  { collection: "places", field: "photos", array: true },
  { collection: "ventures", field: "photos", array: true },
  { collection: "reviews", field: "evidencePhotos", array: true },
  { collection: "lists", field: "coverImage", array: false },
  { collection: "users", field: "image", array: false },
]

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function main() {
  loadEnvFiles()
  const write = process.argv.includes("--write")
  const toMirror = process.argv.includes("--a-copia")
  const toCloud = process.argv.includes("--a-cloudinary")
  if (toMirror === toCloud) {
    throw new Error("Elegí una dirección: --a-copia o --a-cloudinary")
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  if (!cloudName) throw new Error("Falta CLOUDINARY_CLOUD_NAME en el entorno")
  const dir = path.resolve(argValue("--dir") ?? DEFAULT_DIR)
  if (toMirror && !existsSync(dir)) {
    throw new Error(`No existe la carpeta espejo ${dir}: corré antes scripts/cloudinary-backup.ts --write`)
  }

  const fromPrefix = toMirror
    ? `https://res.cloudinary.com/${cloudName}/image/upload/`
    : `${IMAGE_MIRROR_ORIGIN}/`
  console.log(toMirror ? "Cloudinary → copia propia" : "copia propia → Cloudinary")
  if (toMirror) console.log(`Carpeta espejo: ${dir}`)
  console.log(write ? "Modo: --write" : "Modo: dry-run (no escribe)")

  /** La URL nueva, o por qué se deja como está. */
  function convert(url: string): { to: string } | { skip: string } {
    if (!url.startsWith(fromPrefix)) return { skip: "otro host" }
    if (toCloud) {
      const back = toCloudinaryUrl(url, cloudName as string)
      return back ? { to: back } : { skip: "formato raro" }
    }
    const parts = parseCloudinaryOriginal(url, cloudName as string)
    if (!parts) return { skip: "con transformación o nombre raro" }
    if (!existsSync(path.join(dir, parts.filePath))) return { skip: "falta en la copia" }
    return { to: toMirrorUrl(url, cloudName as string) as string }
  }

  const mongoose = (await import("mongoose")).default
  const { default: connectDB } = await import("../lib/mongodb")
  await connectDB()

  const totals = { docs: 0, urls: 0, written: 0, conflicts: 0 }
  const skipped = new Map<string, number>()
  const missingSamples: string[] = []

  for (const { collection, field, array } of FIELDS) {
    const col = mongoose.connection.collection(collection)
    const filter = { [field]: { $regex: `^${escapeRegex(fromPrefix)}` } }
    let docs = 0
    let urls = 0
    let written = 0

    for await (const doc of col.find(filter, { projection: { [field]: 1 } })) {
      const current = doc[field] as unknown
      const values: unknown[] = array ? (Array.isArray(current) ? current : []) : [current]
      let changed = 0
      const next = values.map((value) => {
        if (typeof value !== "string") return value
        const result = convert(value)
        if ("to" in result) {
          changed += 1
          return result.to
        }
        if (result.skip !== "otro host") {
          skipped.set(result.skip, (skipped.get(result.skip) ?? 0) + 1)
          if (result.skip === "falta en la copia" && missingSamples.length < 10) missingSamples.push(value)
        }
        return value
      })
      if (!changed) continue
      docs += 1
      urls += changed
      if (!write) continue

      const res = await col.updateOne(
        { _id: doc._id, [field]: current },
        { $set: { [field]: array ? next : next[0] } }
      )
      if (res.modifiedCount === 1) written += 1
      else totals.conflicts += 1
    }

    console.log(`  ${`${collection}.${field}`.padEnd(24)} docs: ${docs}  urls: ${urls}${write ? `  escritos: ${written}` : ""}`)
    totals.docs += docs
    totals.urls += urls
    totals.written += written
  }

  if (skipped.size) {
    console.log("\nQuedan sin cambiar:")
    for (const [why, n] of skipped) console.log(`  ${why}: ${n}`)
    for (const url of missingSamples) console.log(`    ${url}`)
  }
  if (totals.conflicts) {
    console.log(`\n${totals.conflicts} documentos cambiaron mientras corría: volvé a correrlo.`)
    process.exitCode = 1
  }
  console.log(
    write
      ? `\nListo: ${totals.written} documentos, ${totals.urls} URLs.`
      : `\nDRY-RUN: cambiaría ${totals.urls} URLs en ${totals.docs} documentos. Para aplicar: --write`
  )
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err instanceof Error ? `ERROR: ${err.message}` : err)
  process.exit(1)
})
