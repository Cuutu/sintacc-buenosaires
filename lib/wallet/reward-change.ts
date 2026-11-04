/**
 * El local cambia cuántos sellos pide y qué premio da. Vale para todos los que tienen la tarjeta
 * (los sellos que ya juntaron no se tocan) y les llega como novedad. Una vez cada 15 días.
 */

import { z } from "zod"

export const REWARD_CHANGE_COOLDOWN_MS = 15 * 24 * 60 * 60 * 1000
export const MIN_STAMPS = 1
export const MAX_STAMPS = 20

export const rewardChangeSchema = z.object({
  stampsForReward: z
    .number({ invalid_type_error: "Elegí cuántos sellos" })
    .int()
    .min(MIN_STAMPS, `Mínimo ${MIN_STAMPS} sello`)
    .max(MAX_STAMPS, `Máximo ${MAX_STAMPS} sellos`),
  reward: z.string().trim().min(2, "Escribí el premio").max(80, "El premio puede tener hasta 80 letras"),
})

export type RewardChange = z.infer<typeof rewardChangeSchema>

/** Desde cuándo el local puede volver a cambiarlo (null = ya puede). */
export function nextRewardChangeAt(
  program: { shopRewardChangedAt?: Date | null },
  now = new Date()
): Date | null {
  if (!program.shopRewardChangedAt) return null
  const next = new Date(new Date(program.shopRewardChangedAt).getTime() + REWARD_CHANGE_COOLDOWN_MS)
  return next > now ? next : null
}

export function sameReward(
  program: { stampsForReward: number; reward: string },
  change: RewardChange
): boolean {
  return program.stampsForReward === change.stampsForReward && program.reward.trim() === change.reward.trim()
}

/**
 * ¿Lo último que le pasó a esta tarjeta es el cambio de condiciones? (después de eso no sumó
 * sellos ni canjeó). Así la tarjeta muestra "Nuevas condiciones" en vez del último sello.
 */
export function rewardChangedForCard(
  card: { lastStampAt?: Date | null; lastRedeemAt?: Date | null },
  program: { rewardChangedAt?: Date | null }
): boolean {
  if (!program.rewardChangedAt) return false
  const changedAt = new Date(program.rewardChangedAt).getTime()
  const lastActivity = Math.max(
    card.lastStampAt ? new Date(card.lastStampAt).getTime() : 0,
    card.lastRedeemAt ? new Date(card.lastRedeemAt).getTime() : 0
  )
  return changedAt > lastActivity
}

export { rewardChangeText } from "@/lib/wallet/reward-text"
