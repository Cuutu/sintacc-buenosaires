/**
 * Actualiza las tarjetas en el Wallet donde las guardaron los clientes: después de un sello
 * o canje (una tarjeta) o de un aviso del local (todas las del local).
 * Best-effort: si falla, el cambio ya quedó guardado en la base.
 */

import connectDB from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { LoyaltyCard, type ILoyaltyCard } from "@/models/LoyaltyCard"
import { notifyPassesUpdated, notifyPassUpdated } from "@/lib/wallet/apple-push"
import { getApplePassConfig, getGoogleWalletConfig } from "@/lib/wallet/config"
import { pushGoogleCardUpdate, pushGoogleProgramNotice } from "@/lib/wallet/google-wallet"
import { getProgramWithPlace, passInputFor, type ProgramWithPlace } from "@/lib/wallet/loyalty"

export async function notifyCardChanged(card: ILoyaltyCard): Promise<void> {
  if (card.wallet === "google") {
    const config = getGoogleWalletConfig()
    const data = config ? await getProgramWithPlace(card.programId.toString()) : null
    if (!config || !data) return
    await pushGoogleCardUpdate({ ...passInputFor(card, data), programId: card.programId.toString() }, config)
    return
  }
  const config = getApplePassConfig()
  if (config) await notifyPassUpdated(card.serialNumber, config)
}

/**
 * Manda el aviso del local a todas sus tarjetas. En Apple el aviso va al dorso: se marcan las
 * tarjetas como cambiadas y el iPhone las baja de nuevo. En Google, un mensaje en la clase.
 */
export async function notifyProgramNotice(data: ProgramWithPlace, text: string, now = new Date()): Promise<void> {
  const programId = data.program._id
  const apple = getApplePassConfig()
  if (apple) {
    try {
      await connectDB()
      const filter = { programId, wallet: { $ne: "google" } }
      await LoyaltyCard.updateMany(filter, { $set: { updatedAt: now } }, { timestamps: false })
      const cards = await LoyaltyCard.find(filter).select("serialNumber").lean()
      await notifyPassesUpdated(cards.map((c) => c.serialNumber), apple)
    } catch (error) {
      logger.warn({
        route: "wallet-notice",
        message: "no se pudo mandar el aviso a Apple Wallet",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  const google = getGoogleWalletConfig()
  if (google) {
    await pushGoogleProgramNotice(
      { programId: programId.toString(), placeName: data.placeName, safety: data.safety, location: data.location },
      text,
      google,
      now
    )
  }
}
