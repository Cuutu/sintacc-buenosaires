/**
 * Bulk-approve places pending source=kml.
 *
 *   npx tsx scripts/kml-bulk-approve.ts
 *   npx tsx scripts/kml-bulk-approve.ts --dry-run
 */
import dns from "dns"
import { existsSync, readFileSync } from "fs"
import { resolve } from "path"

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
  const dryRun = process.argv.includes("--dry-run")

  const { default: connectDB } = await import("../lib/mongodb")
  const { Place } = await import("../models/Place")
  await connectDB()

  const filter = { source: "kml" as const, status: "pending" as const }
  const pending = await Place.countDocuments(filter)
  console.log(`Pending KML: ${pending}`)

  if (dryRun) {
    console.log("DRY-RUN — no escribe")
    process.exit(0)
  }

  const result = await Place.updateMany(filter, {
    $set: { status: "approved", updatedAt: new Date() },
  })

  console.log(`Aprobados: ${result.modifiedCount}`)
  const left = await Place.countDocuments(filter)
  const approvedKml = await Place.countDocuments({
    source: "kml",
    status: "approved",
  })
  console.log(`Pending KML restantes: ${left}`)
  console.log(`Approved KML total: ${approvedKml}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
