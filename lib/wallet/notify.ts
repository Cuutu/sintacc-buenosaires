/**
 * Después de sumar un sello o canjear: actualiza la tarjeta en el Wallet donde la guardó el cliente.
 * Best-effort: si falla, el cambio ya quedó guardado en la base.
 */

import type { ILoyaltyCard } from "@/models/LoyaltyCard"
import { notifyPassUpdated } from "@/lib/wallet/apple-push"
import { getApplePassConfig, getGoogleWalletConfig } from "@/lib/wallet/config"
import { pushGoogleCardUpdate } from "@/lib/wallet/google-wallet"
import { getProgramWithPlace, passInputFor } from "@/lib/wallet/loyalty"

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
