/**
 * "Sitio web" con el link de Google Maps → la web real del local (octubre 2026).
 *
 * El formulario de sugerir pide el link de Maps en el mismo campo que la web
 * (`contact.url`), así que muchos lugares publicados tienen ahí un
 * maps.app.goo.gl. Desde el arreglo de la ficha ese link ya no se muestra como
 * sitio web; este script busca en Google la web real y la pone en su lugar.
 *
 * - Solo lugares publicados con link de Maps en "Sitio web" y con ID de Google.
 * - Pide a Google solo `websiteUri` y el nombre (un pedido por lugar).
 * - Si Google no tiene web, el link de Maps queda como está (no se muestra).
 * - Si la "web" de Google es su Instagram y ya está cargado, tampoco se toca.
 * - Si el nombre de Google no se parece al nuestro, lo marca "REVISAR" y no lo
 *   escribe (puede ser otro local con el mismo ID). Para incluirlos:
 *   --incluir-dudosos.
 * - Cada escritura exige que el campo siga igual que en la lectura.
 *
 * Uso (desde la raíz del repo, lee .env.local):
 *   npx tsx scripts/fix-sitio-web-maps.ts                # dry-run: consulta Google, no escribe
 *   npx tsx scripts/fix-sitio-web-maps.ts --sin-google   # solo cuenta y lista, sin consultar Google
 *   npx tsx scripts/fix-sitio-web-maps.ts --limit 20     # los primeros 20
 *   npx tsx scripts/fix-sitio-web-maps.ts --write        # aplica
 */
import { loadEnvFiles } from "./load-env"

const SCRIPT_TAG = "script:fix-sitio-web-maps"
const GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1/places"
const STOPWORDS = new Set([
  "sin", "tacc", "gluten", "glutenfree", "free", "celiacos", "celiaco", "apto", "aptos",
  "the", "las", "los", "del", "con", "por", "para", "cafe", "resto", "restaurante",
  "panaderia", "pasteleria", "heladeria", "bar", "tienda", "solo", "pedidos",
])

function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : undefined
}

function nameWords(name: string): Set<string> {
  return new Set(
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  )
}

/** ¿El nombre de Google comparte alguna palabra con el nuestro? */
function namesLookAlike(ours: string, google: string | undefined): boolean {
  if (!google) return false
  const a = nameWords(ours)
  const b = nameWords(google)
  if (a.size === 0 || b.size === 0) return true
  for (const w of a) if (b.has(w)) return true
  // "Granero66" vs "Granero 66": todo junto tiene que ser igual. Que uno contenga
  // al otro no alcanza: "Bonnevill" está dentro de "Sanitarios Bonneville".
  const flat = (s: string) => s.normalize("NFD").replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
  return flat(google) === flat(ours)
}

type Row = {
  _id: unknown
  slug?: string
  name: string
  url: string
  googlePlaceId?: string
  hasInstagram: boolean
}

async function fetchGoogleWebsite(
  apiKey: string,
  placeId: string
): Promise<{ ok: true; website?: string; name?: string } | { ok: false; status: number }> {
  const params = new URLSearchParams({ languageCode: "es-419" })
  const res = await fetch(`${GOOGLE_PLACES_BASE_URL}/${encodeURIComponent(placeId)}?${params}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "websiteUri,displayName",
    },
  })
  if (!res.ok) return { ok: false, status: res.status }
  const data = (await res.json()) as { websiteUri?: string; displayName?: { text?: string } }
  return { ok: true, website: data.websiteUri?.trim() || undefined, name: data.displayName?.text }
}

async function main() {
  loadEnvFiles()
  if (!process.env.MONGODB_URI?.trim()) {
    console.error("Falta MONGODB_URI en .env.local")
    process.exit(1)
  }

  const write = process.argv.includes("--write")
  const skipGoogle = process.argv.includes("--sin-google")
  const includeDoubtful = process.argv.includes("--incluir-dudosos")
  const limit = Number(argValue("--limit")) || Infinity
  if (write && skipGoogle) {
    console.error("--write necesita consultar Google: sacá --sin-google")
    process.exit(1)
  }

  console.log(
    `fix-sitio-web-maps | ${write ? "WRITE" : "DRY-RUN (no escribe)"}${skipGoogle ? " | sin Google" : ""}`
  )

  const mongoose = (await import("mongoose")).default
  const { default: connectDB } = await import("../lib/mongodb")
  const { MAPS_LINK_URL_PATTERN } = await import("../lib/place-missing-query")
  const { isMapsLink, shouldUseGoogleWebsite } = await import("../lib/place-website")
  const { getGoogleMapsApiKey } = await import("../lib/google-places")

  const apiKey = getGoogleMapsApiKey()
  if (!skipGoogle && !apiKey) {
    console.error("Falta GOOGLE_MAPS_API_KEY / GOOGLE_PLACES_API_KEY en .env.local (o usá --sin-google)")
    process.exit(1)
  }

  await connectDB()
  const col = mongoose.connection.collection("places")
  const docs = await col
    .find(
      { status: "approved", "contact.url": { $regex: MAPS_LINK_URL_PATTERN, $options: "i" } },
      { projection: { name: 1, slug: 1, "contact.url": 1, "contact.instagram": 1, googlePlaceId: 1 } }
    )
    .sort({ name: 1 })
    .toArray()

  const rows: Row[] = docs
    .map((d) => ({
      _id: d._id,
      slug: d.slug as string | undefined,
      name: String(d.name ?? ""),
      url: String((d.contact as { url?: string } | undefined)?.url ?? "").trim(),
      googlePlaceId: (d.googlePlaceId as string | undefined)?.trim() || undefined,
      hasInstagram: Boolean((d.contact as { instagram?: string } | undefined)?.instagram?.trim()),
    }))
    .filter((r) => isMapsLink(r.url))

  const withId = rows.filter((r) => r.googlePlaceId)
  const withoutId = rows.filter((r) => !r.googlePlaceId)
  console.log(
    `Publicados con link de Maps en "Sitio web": ${rows.length} (${withId.length} con ID de Google, ${withoutId.length} sin ID)`
  )

  if (withoutId.length) {
    console.log("\nSin ID de Google (se resuelven solos en la próxima sincronización; quedan como están):")
    for (const r of withoutId) console.log(`  · ${r.slug ?? r._id} | ${r.name}`)
  }

  if (skipGoogle) {
    console.log("\nCon ID de Google:")
    for (const r of withId) console.log(`  · ${r.slug ?? r._id} | ${r.name} | ${r.url}`)
    console.log(`\nPara ver qué web tiene cada uno en Google, corré sin --sin-google (${withId.length} consultas).`)
    await mongoose.disconnect()
    return
  }

  let calls = 0
  let replaced = 0
  let doubtful = 0
  let noWebsite = 0
  let sameAsInstagram = 0
  let errors = 0
  let skippedChanged = 0

  console.log("")
  for (const r of withId.slice(0, limit)) {
    const res = await fetchGoogleWebsite(apiKey as string, r.googlePlaceId as string)
    calls++
    await new Promise((ok) => setTimeout(ok, 120))

    if (!res.ok) {
      console.log(`  ERROR ${res.status} | ${r.slug} | ${r.name}`)
      errors++
      continue
    }
    if (!shouldUseGoogleWebsite(r.url, res.website)) {
      noWebsite++
      continue
    }
    // Si la "web" de Google es su Instagram y ya lo tenemos cargado, no suma nada.
    if (r.hasInstagram && /(^|\.)instagram\.com|instagr\.am/i.test(res.website ?? "")) {
      sameAsInstagram++
      continue
    }

    const alike = namesLookAlike(r.name, res.name)
    const tag = alike ? "OK     " : "REVISAR"
    console.log(`  ${tag} | ${r.slug} | ${r.name}${alike ? "" : ` (Google: ${res.name ?? "?"})`}`)
    console.log(`          ${r.url} → ${res.website}`)
    if (!alike) doubtful++
    if (!write || (!alike && !includeDoubtful)) continue

    const result = await col.updateOne(
      { _id: r._id as never, "contact.url": r.url },
      {
        $set: { "contact.url": res.website, updatedAt: new Date() },
        $push: {
          editLog: {
            $each: [{ at: new Date(), by: SCRIPT_TAG, fields: ["contact.url"] }],
            $position: 0,
            $slice: 12,
          },
        } as never,
      }
    )
    if (result.modifiedCount === 1) replaced++
    else skippedChanged++
  }

  const pending = withId.length - Math.min(withId.length, limit)
  console.log(
    [
      "",
      `Consultas a Google: ${calls}${pending ? ` (quedan ${pending} sin revisar por --limit)` : ""}`,
      `Con web en Google: ${calls - noWebsite - errors - sameAsInstagram} (para revisar a mano: ${doubtful})`,
      `Sin web en Google: ${noWebsite}${sameAsInstagram ? ` + ${sameAsInstagram} cuya web es el Instagram que ya está cargado` : ""} (el link de Maps queda y no se muestra)`,
      errors ? `Errores de Google: ${errors}` : null,
      write
        ? `Reemplazados: ${replaced}${skippedChanged ? ` | salteados porque cambiaron: ${skippedChanged}` : ""}${
            doubtful && !includeDoubtful ? ` | REVISAR no se escribieron (--incluir-dudosos)` : ""
          }`
        : "DRY-RUN: 0 escrituras. Para aplicar: --write",
    ]
      .filter(Boolean)
      .join("\n")
  )
  if (write && replaced > 0) {
    console.log("Las fichas muestran la web nueva en ~1 h (caché).")
  }
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
