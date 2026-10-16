/** Textos de la tarjeta de sellos, iguales en Apple Wallet y Google Wallet. */

/** Sellos y total dentro de rango (total entre 1 y lo que diga el programa). */
export function clampStamps(stamps: number, stampsForReward: number): { stamps: number; total: number } {
  const total = Math.max(1, Math.floor(stampsForReward))
  return { total, stamps: Math.max(0, Math.min(Math.floor(stamps), total)) }
}

/**
 * Texto de "Última novedad". Cuando cambia, el celular lo muestra como aviso,
 * así que cada estado tiene uno distinto.
 */
export function stampNewsMessage(input: {
  stamps: number
  total: number
  placeName: string
  reward: string
  rewardsRedeemed?: number
  /** Sellos que sumó la última visita (2 con sello doble) y por qué. */
  lastStampAdded?: number
  lastStampReason?: "double" | "friend" | "inviter"
}): string {
  const { stamps, total, placeName, reward } = input
  if (stamps <= 0) {
    return (input.rewardsRedeemed ?? 0) > 0
      ? `¡Canjeaste tu premio en ${placeName}! Ya arrancás una tarjeta nueva.`
      : `Mostrá esta tarjeta al pagar en ${placeName} y sumá tu primer sello.`
  }
  const left = total - stamps
  const rest =
    stamps >= total
      ? `¡Completaste la tarjeta! Tu premio te espera: ${reward}.`
      : `Te ${left === 1 ? "falta" : "faltan"} ${left} para tu premio: ${reward}.`
  if (input.lastStampReason === "friend") {
    return `¡Sumaste ${input.lastStampAdded ?? 2} sellos en ${placeName}, uno de regalo por venir con un amigo! ${rest}`
  }
  if (input.lastStampReason === "inviter") {
    return `¡Tu amigo sumó su primer sello en ${placeName} y te regalamos uno! ${rest}`
  }
  if (input.lastStampReason === "double") {
    const added = input.lastStampAdded ?? 2
    return stamps >= total
      ? `¡Sello doble! Sumaste ${added} sellos y completaste la tarjeta. Tu premio te espera en ${placeName}: ${reward}.`
      : `¡Sello doble! Sumaste ${added} sellos en ${placeName}. Te ${left === 1 ? "falta" : "faltan"} ${left} para tu premio: ${reward}.`
  }
  if (stamps >= total) return `¡Completaste la tarjeta! Tu premio te espera en ${placeName}: ${reward}.`
  return `¡Sumaste un sello en ${placeName}! Te ${left === 1 ? "falta" : "faltan"} ${left} para tu premio: ${reward}.`
}

export function stampHowText(total: number, reward: string): string {
  return `Mostrá esta tarjeta al pagar y el local te suma un sello. Con ${total} sellos: ${reward}.`
}

/**
 * Texto que muestra el iPhone en la pantalla bloqueada cuando la persona pasa cerca del local.
 * (En Android el texto lo pone Google.)
 */
export function nearbyText(input: { stamps: number; total: number; placeName: string; reward: string }): string {
  const { stamps, total, placeName, reward } = input
  if (stamps >= total) return `Estás cerca de ${placeName} y tu premio te espera: ${reward}.`
  if (stamps <= 0) return `Estás cerca de ${placeName}. Mostrá tu tarjeta al pagar y sumá un sello.`
  const left = total - stamps
  return `Estás cerca de ${placeName}. Te ${left === 1 ? "falta 1 sello" : `faltan ${left} sellos`} para tu premio.`
}
