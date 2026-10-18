/**
 * Da de alta (o actualiza) la tarjeta de sellos de un local.
 * Simulación por defecto; escribe sólo con --write.
 *
 *   npx tsx scripts/crear-programa-fidelidad.ts --lugar <slug> --sellos 5 \
 *     --premio "Un café de regalo" --staff caja@local.com,duenio@local.com [--write]
 *
 * Imprime el link para el cartel con QR de la caja.
 */
import { loadEnvConfig } from "@next/env"
import mongoose from "mongoose"

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  loadEnvConfig(process.cwd())
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error("Falta MONGODB_URI")

  const slug = arg("lugar")?.trim()
  const stampsForReward = Number(arg("sellos") ?? 5)
  const reward = arg("premio")?.trim()
  const staffEmails = (arg("staff") ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const write = process.argv.includes("--write")

  if (!slug || !reward || !Number.isInteger(stampsForReward) || stampsForReward < 1 || stampsForReward > 20) {
    console.error('Uso: --lugar <slug> --sellos <1-20> --premio "..." --staff mail1,mail2 [--write]')
    process.exitCode = 1
    return
  }
  if (staffEmails.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) {
    console.error("Hay un mail de --staff que no es válido.")
    process.exitCode = 1
    return
  }

  const { Place } = await import("../models/Place")
  const { LoyaltyProgram } = await import("../models/LoyaltyProgram")
  const { getBaseUrl } = await import("../lib/base-url")

  await mongoose.connect(uri, { autoIndex: false })
  try {
    const place = await Place.findOne({ slug }).select("name status").lean()
    if (!place) throw new Error(`No hay un lugar con slug "${slug}"`)
    if (place.status !== "approved") console.warn("Ojo: el lugar no está publicado (status pending).")

    const existing = await LoyaltyProgram.findOne({ placeId: place._id })
    console.log(write ? "Escribiendo" : "Simulación (sin escrituras; agregá --write)")
    console.log({ lugar: place.name, sellos: stampsForReward, premio: reward, staff: staffEmails })
    console.log(existing ? `Actualiza el programa ${existing._id}` : "Crea un programa nuevo")
    if (!write) return

    const program = await LoyaltyProgram.findOneAndUpdate(
      { placeId: place._id },
      { $set: { stampsForReward, reward, staffEmails, active: true } },
      { upsert: true, new: true }
    )
    console.log(`Listo. Link del cartel: ${getBaseUrl()}/tarjeta/${program._id}`)
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falló el alta del programa")
  process.exitCode = 1
})
