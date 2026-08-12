/**
 * Diagnóstico SEO de ciudades — solo lectura.
 *
 * Uso:
 *   npx tsx scripts/diagnose-city-seo.ts la-plata san-miguel-de-tucuman yerba-buena
 *
 * - No escribe en MongoDB.
 * - No imprime credenciales, emails, tokens ni documentos completos.
 * - Usa las mismas funciones que producción.
 * - Exit 1 si algún slug falla o hay error fatal.
 *
 * Nota: `tsx` no carga .env.local solo (Next sí) → usamos loadEnvFiles().
 */

import { loadEnvFiles } from "./load-env"

const DEFAULT_SLUGS = ["la-plata", "san-miguel-de-tucuman", "yerba-buena"]

async function main() {
  loadEnvFiles()

  if (!process.env.MONGODB_URI?.trim()) {
    console.error(
      "Falta MONGODB_URI. Revisá .env.local en la raíz del repo, o en PowerShell:\n" +
        '  $env:MONGODB_URI="mongodb+srv://..."\n' +
        "  npx tsx scripts/diagnose-city-seo.ts la-plata"
    )
    process.exit(1)
  }

  const { getCityBySlug } = await import("../lib/seo/cities")
  const { getCityPageStats, getPlacesByCity } = await import("../lib/seo/places")
  const { evaluateCityPageIndexability } = await import(
    "../lib/seo/city-index-quality"
  )
  const { getCityIndexException, getCityMinPlaces } = await import(
    "../lib/seo/indexing-config"
  )

  const slugs = process.argv.slice(2).filter(Boolean)
  const targets = slugs.length > 0 ? slugs : DEFAULT_SLUGS
  console.log("diagnose-city-seo (read-only)")
  console.log(`targets: ${targets.join(", ")}`)

  let failed = 0
  for (const slug of targets) {
    try {
      const city = getCityBySlug(slug)
      const stats = await getCityPageStats(slug)
      const { total } = await getPlacesByCity(slug, 1)
      const exception = getCityIndexException(city?.slug ?? slug)
      const evaluation = evaluateCityPageIndexability({
        citySlug: city?.slug ?? slug,
        totalPlaces: stats.total,
      })

      console.log("---")
      console.log(`slug: ${slug}`)
      console.log(
        `seed: ${city ? `${city.name}` : "NO_EN_SEED"} | province=${city?.provinceSlug ?? "n/a"} | locality_slug=${city?.slug ?? "n/a"}`
      )
      console.log(`total_lugares: ${stats.total} (list_page1=${total})`)
      console.log(`100_libre_gluten: ${stats.dedicatedGf}`)
      console.log(`con_opciones: ${stats.gfOptions}`)
      console.log(
        `categorias: ${stats.categories.map((c) => `${c.slug}:${c.count}`).join(",") || "(none)"}`
      )
      console.log(`excepcion: ${exception ? `si min=${exception.minPlaces}` : "no"}`)
      if (exception) console.log(`excepcion_motivo: ${exception.reason}`)
      console.log(`umbral_aplicado: ${getCityMinPlaces(city?.slug ?? slug)}`)
      console.log(`decision: ${evaluation.decision}`)
      console.log(`motivo: ${evaluation.reason}`)
      console.log(`calidad_ok: ${evaluation.qualityPassed}`)
      console.log(`editorial: ${evaluation.hasEditorialContent}`)
      console.log(`geo_valida: ${evaluation.hasValidGeography}`)
    } catch (err) {
      failed += 1
      console.log("---")
      console.log(`slug: ${slug}`)
      console.log(`error: ${err instanceof Error ? err.message : "unknown"}`)
    }
  }
  console.log("---")
  if (failed > 0) {
    console.log(`done_with_errors: ${failed}`)
    process.exit(1)
  }
  console.log("done")
  process.exit(0)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
