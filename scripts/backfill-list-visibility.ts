import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import { LIST_VISIBILITY } from "../lib/lists/constants"

/** Carga .env.local / .env para scripts tsx (Next no los inyecta acá). */
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

/**
 * Backfill aditivo y no destructivo:
 * - Asigna visibility=PUBLIC a listas sin el campo
 * - Sincroniza isPublic=true para PUBLIC
 * - No toca listas ya PRIVATE_LINK
 *
 * Uso:
 *   npm run backfill:list-visibility
 *   # o:
 *   $env:MONGODB_URI="mongodb+srv://..."; npm run backfill:list-visibility
 */
async function backfillListVisibility() {
  loadEnvFiles()

  if (!process.env.MONGODB_URI) {
    throw new Error(
      "Falta MONGODB_URI. Creá .env.local con tu connection string de Atlas, o en PowerShell:\n" +
        '  $env:MONGODB_URI="mongodb+srv://USER:PASS@cluster.../dbname?retryWrites=true&w=majority"\n' +
        "  npm run backfill:list-visibility"
    )
  }

  // Import dinámico: mongodb.ts lee MONGODB_URI al cargar el módulo
  const { default: connectDB } = await import("../lib/mongodb")
  const { List } = await import("../models/List")

  await connectDB()
  console.log("Conectado a MongoDB Atlas")

  const missingVisibility = await List.updateMany(
    {
      $or: [{ visibility: { $exists: false } }, { visibility: null }],
    },
    {
      $set: {
        visibility: LIST_VISIBILITY.PUBLIC,
        isPublic: true,
      },
    }
  )

  const syncPublic = await List.updateMany(
    { visibility: LIST_VISIBILITY.PUBLIC, isPublic: { $ne: true } },
    { $set: { isPublic: true } }
  )

  const syncPrivate = await List.updateMany(
    { visibility: LIST_VISIBILITY.PRIVATE_LINK, isPublic: { $ne: false } },
    { $set: { isPublic: false } }
  )

  console.log("Backfill terminado")
  console.log(`Sin visibility → PUBLIC: ${missingVisibility.modifiedCount}`)
  console.log(`PUBLIC sync isPublic: ${syncPublic.modifiedCount}`)
  console.log(`PRIVATE_LINK sync isPublic: ${syncPrivate.modifiedCount}`)
}

backfillListVisibility()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error en backfill de visibility de listas:", error)
    process.exit(1)
  })
