/** Textos de las insignias de los Wallets (sin leer el disco: sirven también en el navegador). */

import type { LoyaltyWallet } from "@/models/LoyaltyCard"

export const BADGE_ALT: Record<LoyaltyWallet, string> = {
  apple: "Agregar a Apple Wallet",
  google: "Agregar a Google Wallet",
}

/** Lo que piden las marcas cuando aparece la insignia (va en letra chica). */
export const BADGE_TRADEMARK: Record<LoyaltyWallet, string> = {
  apple: "Apple y Apple Wallet son marcas de Apple Inc., registradas en EE. UU. y otros países.",
  google: "Google Wallet es una marca de Google LLC.",
}
