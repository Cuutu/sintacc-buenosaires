/**
 * Copia todas las imágenes de Cloudinary (originales) a una carpeta local.
 * Respaldo por si la cuenta gratis se corta: ver docs/RESPALDO-IMAGENES.md.
 *
 * Por defecto es dry-run: lista lo que hay en Cloudinary y lo que falta copiar,
 * sin bajar nada. Con --write baja sólo lo que falta (o cambió de tamaño), así que
 * se puede correr de vuelta cuando haya fotos nuevas.
 *
 * OJO: bajar los originales gasta ancho de banda de Cloudinary (~1 crédito por GB).
 * El dry-run dice cuántos MB va a bajar.
 *
 * Uso (desde la raíz del repo; necesita CLOUDINARY_CLOUD_NAME, _API_KEY y _API_SECRET):
 *   npx tsx scripts/cloudinary-backup.ts                       # dry-run
 *   npx tsx scripts/cloudinary-backup.ts --write               # copia lo que falta
 *   npx tsx scripts/cloudinary-backup.ts --write --max 20      # prueba con 20 archivos
 *   npx tsx scripts/cloudinary-backup.ts --dir ./img-mirror    # otra carpeta
 *
 * Carpeta por defecto: /srv/celimap/shared/img-mirror (la que sirve Caddy).
 */
import { createWriteStream } from "fs"
import { mkdir, readFile, rename, stat, unlink, writeFile } from "fs/promises"
import path from "path"
import { Readable } from "stream"
import { pipeline } from "stream/promises"
import { mirrorFilePathFor } from "../lib/image-mirror"
import { loadEnvFiles } from "./load-env"

const DEFAULT_DIR = "/srv/celimap/shared/img-mirror"
const PAGE_SIZE = 500
const CONCURRENCY = 4

type Resource = {
  public_id: string
  format: string
  version: number
  bytes: number
  secure_url: string
  created_at: string
}

type Entry = Resource & { filePath: string }

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function sizeOnDisk(file: string): Promise<number | null> {
  try {
    return (await stat(file)).size
  } catch {
    return null
  }
}

async function previousVersions(dir: string): Promise<Map<string, number>> {
  try {
    const raw = JSON.parse(await readFile(path.join(dir, ".manifest.json"), "utf8")) as {
      images?: { file?: string; version?: number; copied?: boolean }[]
    }
    return new Map(
      (raw.images ?? [])
        .filter((i) => i.copied && typeof i.file === "string" && typeof i.version === "number")
        .map((i) => [i.file as string, i.version as number])
    )
  } catch {
    return new Map()
  }
}

async function listAll(): Promise<Resource[]> {
  const { v2: cloudinary } = await import("cloudinary")
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  const all: Resource[] = []
  let cursor: string | undefined
  do {
    const page = (await cloudinary.api.resources({
      type: "upload",
      resource_type: "image",
      max_results: PAGE_SIZE,
      ...(cursor ? { next_cursor: cursor } : {}),
    })) as { resources: Resource[]; next_cursor?: string }
    all.push(...page.resources)
    cursor = page.next_cursor
    process.stdout.write(`\r  listando… ${all.length}`)
  } while (cursor)
  process.stdout.write("\n")
  return all
}

async function download(entry: Entry, dir: string): Promise<void> {
  const dest = path.join(dir, entry.filePath)
  await mkdir(path.dirname(dest), { recursive: true })
  const tmp = `${dest}.part`
  const res = await fetch(entry.secure_url)
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
  try {
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tmp))
    await rename(tmp, dest)
  } catch (error) {
    await unlink(tmp).catch(() => undefined)
    throw error
  }
}

async function main() {
  loadEnvFiles()
  const write = process.argv.includes("--write")
  const dir = path.resolve(argValue("--dir") ?? DEFAULT_DIR)
  const maxRaw = argValue("--max")
  const max = maxRaw ? Number.parseInt(maxRaw, 10) : Number.POSITIVE_INFINITY
  if (maxRaw && (!Number.isFinite(max) || max <= 0)) throw new Error("--max tiene que ser un número > 0")

  for (const key of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
    if (!process.env[key]) throw new Error(`Falta ${key} en el entorno`)
  }

  console.log(`Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`)
  console.log(`Carpeta:    ${dir}`)
  console.log(write ? "Modo:       --write (baja lo que falta)" : "Modo:       dry-run (no baja nada)")

  const resources = await listAll()
  const entries: Entry[] = []
  const unsafe: string[] = []
  for (const r of resources) {
    const filePath = mirrorFilePathFor(r.public_id, r.format)
    if (filePath) entries.push({ ...r, filePath })
    else unsafe.push(`${r.public_id}.${r.format}`)
  }

  const byFolder = new Map<string, { count: number; bytes: number }>()
  for (const e of entries) {
    const folder = e.filePath.includes("/") ? e.filePath.split("/")[0] : "(raíz)"
    const acc = byFolder.get(folder) ?? { count: 0, bytes: 0 }
    acc.count += 1
    acc.bytes += e.bytes
    byFolder.set(folder, acc)
  }
  console.log(`\nEn Cloudinary: ${resources.length} imágenes, ${mb(resources.reduce((s, r) => s + r.bytes, 0))}`)
  for (const [folder, acc] of [...byFolder].sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`  ${folder.padEnd(14)} ${String(acc.count).padStart(6)}  ${mb(acc.bytes)}`)
  }
  if (unsafe.length) {
    console.log(`\nSe saltean ${unsafe.length} con nombres que no se pueden usar como archivo:`)
    for (const id of unsafe.slice(0, 20)) console.log(`  ${id}`)
  }

  // Versión ya copiada de cada archivo (del manifiesto anterior): si Cloudinary
  // entrega el original con otro tamaño que el que informa, no se baja de nuevo.
  const copiedVersion = await previousVersions(dir)
  const missing: Entry[] = []
  for (const e of entries) {
    const size = await sizeOnDisk(path.join(dir, e.filePath))
    if (size === null) missing.push(e)
    else if (size !== e.bytes && copiedVersion.get(e.filePath) !== e.version) missing.push(e)
  }
  const toCopy = missing.slice(0, max)
  const toCopyBytes = toCopy.reduce((s, e) => s + e.bytes, 0)
  console.log(`\nYa copiadas: ${entries.length - missing.length}`)
  console.log(`Faltan:      ${missing.length} (${mb(missing.reduce((s, e) => s + e.bytes, 0))})`)
  if (toCopy.length < missing.length) console.log(`Con --max:   se bajan ${toCopy.length} (${mb(toCopyBytes)})`)

  if (!write) {
    console.log(`\nDRY-RUN: no se bajó nada. Con --write se bajan ~${mb(toCopyBytes)} (≈ ${(toCopyBytes / 1024 ** 3).toFixed(2)} créditos de Cloudinary).`)
    return
  }

  await mkdir(dir, { recursive: true })
  const downloaded = new Set<string>()
  let done = 0
  let failed = 0
  let next = 0
  const errors: string[] = []
  async function worker() {
    while (next < toCopy.length) {
      const entry = toCopy[next++]
      try {
        await download(entry, dir)
        downloaded.add(entry.filePath)
        done += 1
      } catch (error) {
        failed += 1
        errors.push(`${entry.filePath}: ${error instanceof Error ? error.message : String(error)}`)
      }
      process.stdout.write(`\r  copiando… ${done + failed}/${toCopy.length} (errores: ${failed})`)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, toCopy.length) }, worker))
  if (toCopy.length) process.stdout.write("\n")

  const manifest = []
  for (const { public_id, format, version, bytes, created_at, filePath } of entries) {
    const size = await sizeOnDisk(path.join(dir, filePath))
    const copied =
      size !== null && (size === bytes || downloaded.has(filePath) || copiedVersion.get(filePath) === version)
    manifest.push({ public_id, format, version, bytes, created_at, file: filePath, copied })
  }
  await writeFile(
    path.join(dir, ".manifest.json"),
    JSON.stringify({ cloud: process.env.CLOUDINARY_CLOUD_NAME, at: new Date().toISOString(), images: manifest }, null, 1)
  )

  console.log(`\nCopiadas: ${done} | con error: ${failed} | manifiesto: ${path.join(dir, ".manifest.json")}`)
  for (const line of errors.slice(0, 20)) console.log(`  ${line}`)
  if (failed) {
    console.log("Correlo de vuelta para reintentar las que fallaron (sólo baja lo que falta).")
    process.exitCode = 1
  }
}

main().catch((err) => {
  const message = err?.error?.message ?? err?.message ?? String(err)
  console.error(`ERROR: ${message}`)
  if (err?.error?.http_code === 420) {
    console.error("Cloudinary limita la Admin API por hora en el plan gratis: esperá un rato y volvé a correrlo.")
  }
  process.exit(1)
})
