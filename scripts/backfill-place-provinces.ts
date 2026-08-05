/**
 * Backfill idempotente de campos geográficos normalizados en Place.
 *
 * Completa `province` y `locality` de forma INDEPENDIENTE:
 * puede conocerse la provincia y no la localidad (guarda solo la provincia
 * y reporta la localidad como pendiente).
 *
 * Orden de preferencia:
 *   1. Campo `province`/`locality` existente (ya resuelto → skip).
 *   2. Datos estructurados del snapshot/geocoding (`addressText`, `googleSnapshot`).
 *   3. Coordenadas dentro de POLÍGONOS ADMINISTRATIVOS CONFIABLES.
 *      (NO bounding boxes ni "límites aproximados", especialmente CABA/PBA.
 *       Si no hay polígono confiable disponible, el registro queda ambiguo.)
 *   4. Parsing de dirección como fallback controlado.
 *
 * "Buenos Aires" a secas NO resuelve PBA (ambiguo con CABA).
 * Es preferible NO migrar un lugar antes que asignarlo a una provincia incorrecta.
 *
 * Uso:
 *   tsx scripts/backfill-place-provinces.ts --dry-run
 *   tsx scripts/backfill-place-provinces.ts            # escritura real (requiere revisión previa)
 */
import connectDB from "../lib/mongodb"
import { Place } from "../models/Place"
import { CITIES } from "../lib/seo/cities"
import {
  getProvinceByAlias,
  getProvinceByName,
  resolveProvinceFromAddress,
} from "../lib/seo/provinces"

const DRY_RUN = process.argv.includes("--dry-run")

interface AmbiguousCase {
  _id: string
  name: string
  address: string
  reason: string
}

interface Report {
  total: number
  provinceResolved: number
  provinceAmbiguous: number
  provinceNoData: number
  localityResolved: number
  localityPending: number
  ambiguous: AmbiguousCase[]
  samples: Record<string, { resolved: number; ambiguous: number; sample: string[] }>
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

/** Resuelve locality slug matcheando neighborhood/address contra CITIES */
function resolveLocalityFromText(text: string): string | undefined {
  const normalized = normalize(text)
  if (!normalized) return undefined
  for (const city of CITIES) {
    const cityName = normalize(city.name)
    const citySlug = city.slug
    if (normalized.includes(cityName) || normalized.includes(citySlug.replace(/-/g, " "))) {
      return city.slug
    }
    for (const n of city.neighborhoods) {
      if (normalized === normalize(n)) return city.slug
    }
  }
  return undefined
}

/** Resuelve provincia desde datos estructurados del geocoding (addressText) */
function resolveProvinceFromStructured(addressText?: string): string | undefined {
  if (!addressText?.trim()) return undefined
  const normalized = normalize(addressText)
  for (const p of PROVINCE_SLUGS) {
    const province = getProvinceByName(p) ?? getProvinceByAlias(p)
    if (!province) continue
    const nameNorm = normalize(province.name)
    if (normalized.includes(`provincia de ${nameNorm}`) || normalized.includes(nameNorm)) {
      // "buenos aires" dentro de addressText es ambiguo (CABA vs PBA)
      if (province.slug === "buenos-aires" && !normalized.includes("provincia de buenos aires")) {
        continue
      }
      return province.slug
    }
  }
  return undefined
}

const PROVINCE_SLUGS = [
  "buenos-aires", "caba", "catamarca", "chaco", "chubut", "cordoba", "corrientes",
  "entre-rios", "formosa", "jujuy", "la-pampa", "la-rioja", "mendoza", "misiones",
  "neuquen", "rio-negro", "salta", "san-juan", "san-luis", "santa-cruz", "santa-fe",
  "santiago-del-estero", "tierra-del-fuego", "tucuman",
]

function isAmbiguousBuenosAires(address: string, addressText?: string): boolean {
  const text = normalize(`${address} ${addressText || ""}`)
  if (!text.includes("buenos aires")) return false
  if (text.includes("provincia de buenos aires")) return false
  if (text.includes("caba") || text.includes("capital federal")) return false
  return true
}

async function main() {
  await connectDB()
  console.log(`Conectado a MongoDB (${DRY_RUN ? "DRY-RUN — sin escritura" : "MODO ESCRITURA"})`)

  const places = await Place.find(
    {},
    { _id: 1, name: 1, address: 1, addressText: 1, neighborhood: 1, province: 1, locality: 1, location: 1 }
  ).lean()

  const report: Report = {
    total: places.length,
    provinceResolved: 0,
    provinceAmbiguous: 0,
    provinceNoData: 0,
    localityResolved: 0,
    localityPending: 0,
    ambiguous: [],
    samples: {
      caba: { resolved: 0, ambiguous: 0, sample: [] },
      "buenos-aires": { resolved: 0, ambiguous: 0, sample: [] },
      cordoba: { resolved: 0, ambiguous: 0, sample: [] },
      tucuman: { resolved: 0, ambiguous: 0, sample: [] },
      "mar-del-plata": { resolved: 0, ambiguous: 0, sample: [] },
      "la-plata": { resolved: 0, ambiguous: 0, sample: [] },
    },
  }

  const updates: { _id: string; province?: string; locality?: string }[] = []

  for (const place of places as any[]) {
    const id = place._id.toString()
    let province = place.province
    let locality = place.locality

    // ── PROVINCIA ──
    if (!province) {
      // 1. Datos estructurados del geocoding
      province = resolveProvinceFromStructured(place.addressText)

      // 2. Parsing de dirección controlado (fallback)
      if (!province) {
        const fromAddress = resolveProvinceFromAddress(place.address || "")
        if (fromAddress) {
          province = fromAddress.slug
        }
      }

      // 3. Coordenadas: solo con polígono administrativo confiable.
      //    No existe infraestructura de polígonos en el proyecto → se omite.
      //    (NO usar bounding boxes, especialmente CABA/PBA.)

      if (!province) {
        const ambiguous = isAmbiguousBuenosAires(place.address || "", place.addressText)
        if (ambiguous) {
          report.provinceAmbiguous += 1
          report.ambiguous.push({ _id: id, name: place.name, address: place.address || "", reason: "Buenos Aires ambiguo (CABA vs PBA)" })
        } else {
          report.provinceNoData += 1
        }
      } else {
        report.provinceResolved += 1
      }
    }

    // ── LOCALITY ──
    if (!locality) {
      locality = resolveLocalityFromText(place.neighborhood || "")
      if (!locality) {
        locality = resolveLocalityFromText(place.address || "")
      }
      if (!locality) {
        locality = resolveLocalityFromText(place.addressText || "")
      }
      if (locality) {
        report.localityResolved += 1
      } else {
        report.localityPending += 1
      }
    }

    // Muestras por jurisdicción objetivo
    const sampleKey = province ?? (isAmbiguousBuenosAires(place.address || "", place.addressText) ? "buenos-aires" : null)
    if (sampleKey && report.samples[sampleKey]) {
      const s = report.samples[sampleKey]
      if (province) s.resolved += 1
      else s.ambiguous += 1
      if (s.sample.length < 5) s.sample.push(`${place.name} (${place.neighborhood})`)
    }

    if (province !== place.province || locality !== place.locality) {
      updates.push({
        _id: id,
        ...(province !== place.province && province ? { province } : {}),
        ...(locality !== place.locality && locality ? { locality } : {}),
      })
    }
  }

  // ── Reporte ──
  console.log("\n═══════════ REPORTE ═══════════")
  console.log(`Total lugares: ${report.total}`)
  console.log(`Provincia resuelta: ${report.provinceResolved}`)
  console.log(`Provincia ambigua: ${report.provinceAmbiguous}`)
  console.log(`Provincia sin datos: ${report.provinceNoData}`)
  console.log(`Localidad resuelta: ${report.localityResolved}`)
  console.log(`Localidad pendiente: ${report.localityPending}`)
  console.log(`Registros a actualizar: ${updates.length}`)

  console.log("\n── Muestras por jurisdicción ──")
  for (const [key, s] of Object.entries(report.samples)) {
    console.log(`${key}: resueltos=${s.resolved}, ambiguos=${s.ambiguous}`)
    for (const sample of s.sample) console.log(`  · ${sample}`)
  }

  if (report.ambiguous.length > 0) {
    console.log("\n── Casos ambiguos ──")
    for (const a of report.ambiguous.slice(0, 20)) {
      console.log(`  · ${a.name} (${a.address}) — ${a.reason}`)
    }
    if (report.ambiguous.length > 20) {
      console.log(`  … y ${report.ambiguous.length - 20} más`)
    }
  }

  if (DRY_RUN) {
    console.log("\nDRY-RUN: no se escribió nada. Revisá el reporte antes de ejecutar sin --dry-run.")
    process.exit(0)
  }

  if (updates.length === 0) {
    console.log("\nSin cambios pendientes.")
    process.exit(0)
  }

  console.log(`\nEscribiendo ${updates.length} actualizaciones…`)
  for (const u of updates) {
    const set: Record<string, string> = {}
    if (u.province) set.province = u.province
    if (u.locality) set.locality = u.locality
    await Place.updateOne({ _id: u._id }, { $set: set })
  }
  console.log("Backfill completado.")
  process.exit(0)
}

main().catch((error) => {
  console.error("Error en backfill:", error)
  process.exit(1)
})