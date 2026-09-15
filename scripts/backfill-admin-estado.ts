import { loadEnvConfig } from "@next/env"
import mongoose from "mongoose"

async function main() {
  loadEnvConfig(process.cwd())
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error("Falta MONGODB_URI")
  const apply = process.argv.includes("--apply")
  await mongoose.connect(uri, { autoIndex: false })
  try {
    const db = mongoose.connection.db
    if (!db) throw new Error("No se pudo abrir la base de datos")
    console.log(apply ? "Aplicando migración" : "Simulación (sin escrituras)")
    for (const name of ["contacts", "reviews", "venturereviews"]) {
      const collection = db.collection(name)
      const filter = { estado: { $exists: false } }
      const count = await collection.countDocuments(filter)
      console.log(`${name}: ${count} documentos sin estado`)
      if (apply) {
        const result = await collection.updateMany(filter, { $set: { estado: "pendiente" } })
        console.log(`${name}: ${result.modifiedCount} actualizados`)
      }
    }
  } finally {
    await mongoose.disconnect()
  }
}

main().catch(() => {
  console.error("Falló la migración. Revisá conexión y permisos de MONGODB_URI.")
  process.exitCode = 1
})
