/**
 * Baja a gf_options lugares marcados 100% GF sin tag 100_gf.
 * certificado_sin_tacc = materia prima, no cocina dedicada (Growlers).
 *
 *   npx tsx scripts/fix-false-dedicated-gf.ts
 *   npx tsx scripts/fix-false-dedicated-gf.ts --write
 */
import dns from "dns"
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"
import connectDB from "../lib/mongodb"
import { Place } from "../models/Place"
import { invalidateApiCache } from "../lib/api-cache"

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

async function main() {
  loadEnvFiles()
  const write = process.argv.includes("--write")
  await connectDB()

  const growlers = await Place.find({ name: /growlers/i })
    .select("name slug safetyLevel tags status")
    .lean()
  console.log("Growlers ahora:")
  console.log(JSON.stringify(growlers, null, 2))

  const falseDedicated = await Place.find({
    status: "approved",
    safetyLevel: "dedicated_gf",
    tags: { $in: ["opciones_sin_tacc", "certificado_sin_tacc"] },
    $nor: [{ tags: "100_gf" }],
  })
    .select("name slug safetyLevel tags")
    .lean()

  console.log(
    `\ndedicated_gf + (opciones|certificado) sin 100_gf: ${falseDedicated.length}`
  )
  for (const p of falseDedicated) {
    console.log(`  ${p.name} | tags=${(p.tags ?? []).join(",")}`)
  }

  if (!write) {
    console.log("\nDry-run. Pasá --write para bajarlos a gf_options.")
    process.exit(0)
  }

  const ids = falseDedicated.map((p) => p._id)
  if (ids.length === 0) {
    console.log("Nada que corregir.")
    process.exit(0)
  }

  const result = await Place.updateMany(
    { _id: { $in: ids } },
    {
      $set: { safetyLevel: "gf_options" },
      $addToSet: { tags: "opciones_sin_tacc" },
    }
  )

  try {
    invalidateApiCache(["public:places:", "admin:places:", "seo:province:"])
  } catch {
    /* fuera de Next */
  }

  console.log(JSON.stringify({ modified: result.modifiedCount }, null, 2))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
