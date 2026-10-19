/**
 * Actualiza las tarjetas en el Wallet donde las guardaron los clientes: después de un sello
 * o canje (una tarjeta) o de un aviso del local (todas las del local).
 * Best-effort: si falla, el cambio ya quedó guardado en la base.
 */

import connectDB from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { LoyaltyCard, type ILoyaltyCard } from "@/models/LoyaltyCard"
import { notifyPassesUpdated, notifyPassUpdated } from "@/lib/wallet/apple-push"
import { getApplePassConfig, getGoogleWalletConfig, type ApplePassConfig } from "@/lib/wallet/config"
import {
  pushGoogleCardUpdate,
  pushGoogleProgramNotice,
  refreshGoogleCard,
  refreshGoogleClass,
} from "@/lib/wallet/google-wallet"
import { getProgramWithPlace, passInputFor, type ProgramWithPlace } from "@/lib/wallet/loyalty"
import { rewardChangeText } from "@/lib/wallet/reward-text"

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

/** Marca como cambiadas todas las tarjetas de Apple del local y avisa a los iPhone que las bajen de nuevo. */
async function refreshApplePasses(
  programId: ProgramWithPlace["program"]["_id"],
  apple: ApplePassConfig,
  now: Date,
  what: string
): Promise<void> {
  try {
    await connectDB()
    const filter = { programId, wallet: { $ne: "google" } }
    await LoyaltyCard.updateMany(filter, { $set: { updatedAt: now } }, { timestamps: false })
    const cards = await LoyaltyCard.find(filter).select("serialNumber").lean()
    await notifyPassesUpdated(cards.map((c) => c.serialNumber), apple)
  } catch (error) {
    logger.warn({
      route: "wallet-refresh",
      message: `no se pudo mandar ${what} a Apple Wallet`,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Manda el aviso del local a todas sus tarjetas. En Apple el aviso va al dorso: se marcan las
 * tarjetas como cambiadas y el iPhone las baja de nuevo. En Google, un mensaje en la clase.
 */
export async function notifyProgramNotice(data: ProgramWithPlace, text: string, now = new Date()): Promise<void> {
  const programId = data.program._id
  const apple = getApplePassConfig()
  if (apple) await refreshApplePasses(programId, apple, now, "el aviso")
  const google = getGoogleWalletConfig()
  if (google) {
    await pushGoogleProgramNotice(
      { programId: programId.toString(), placeName: data.placeName, safety: data.safety, locations: data.locations },
      text,
      google,
      now
    )
  }
}

/** Tope de tarjetas de Google que se actualizan de una (el resto, en su próximo sello). */
export const GOOGLE_REFRESH_LIMIT = 500

/**
 * El local cambió una promo: todas sus tarjetas se actualizan sin aviso al celu
 * (en Apple la novedad no cambia, así que el iPhone no muestra nada).
 */
export async function refreshProgramCards(data: ProgramWithPlace, now = new Date()): Promise<void> {
  const apple = getApplePassConfig()
  if (apple) await refreshApplePasses(data.program._id, apple, now, "la promo")
  const google = getGoogleWalletConfig()
  if (google) await refreshGoogleCards(data, google, now)
}

/**
 * Cambiaron los sellos o el premio: se actualizan todas las tarjetas y les llega un aviso.
 * En Apple, "Última novedad" pasa a contar las nuevas condiciones (y el iPhone lo muestra);
 * en Google, además, un mensaje en la clase.
 */
export async function notifyRewardChanged(data: ProgramWithPlace, now = new Date()): Promise<void> {
  const apple = getApplePassConfig()
  if (apple) await refreshApplePasses(data.program._id, apple, now, "las nuevas condiciones")
  const google = getGoogleWalletConfig()
  if (!google) return
  await refreshGoogleCards(data, google, now)
  await pushGoogleProgramNotice(
    {
      programId: data.program._id.toString(),
      placeName: data.placeName,
      safety: data.safety,
      locations: data.locations,
    },
    rewardChangeText(data.placeName, data.program.stampsForReward, data.program.reward),
    google,
    now
  )
}

/** La clase (nombre, ubicaciones) y hasta GOOGLE_REFRESH_LIMIT tarjetas de Google del local. */
async function refreshGoogleCards(
  data: ProgramWithPlace,
  google: NonNullable<ReturnType<typeof getGoogleWalletConfig>>,
  now: Date
): Promise<void> {
  const programId = data.program._id
  await refreshGoogleClass(
    { programId: programId.toString(), placeName: data.placeName, safety: data.safety, locations: data.locations },
    google
  )
  try {
    await connectDB()
    const cards = await LoyaltyCard.find({ programId, wallet: "google" })
      .sort({ updatedAt: -1 })
      .limit(GOOGLE_REFRESH_LIMIT)
    // De a 5 para no saturar la API de Google.
    for (let i = 0; i < cards.length; i += 5) {
      await Promise.all(
        cards
          .slice(i, i + 5)
          .map((card) =>
            refreshGoogleCard({ ...passInputFor(card, data, now), programId: programId.toString() }, google)
          )
      )
    }
  } catch (error) {
    logger.warn({
      route: "wallet-refresh",
      message: "no se pudo actualizar las tarjetas de Google Wallet",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
