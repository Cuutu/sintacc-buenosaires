import {
  nextRewardChangeAt,
  REWARD_CHANGE_COOLDOWN_MS,
  rewardChangedForCard,
  rewardChangeSchema,
  sameReward,
} from "@/lib/wallet/reward-change"
import { stampNewsMessage } from "@/lib/wallet/card-text"

const day = 24 * 60 * 60 * 1000
const now = new Date("2026-10-19T15:00:00Z")

describe("cambio de sellos y premio", () => {
  it("waits 15 days between changes made by the shop", () => {
    expect(REWARD_CHANGE_COOLDOWN_MS).toBe(15 * day)
    expect(nextRewardChangeAt({}, now)).toBeNull()
    const recent = new Date(now.getTime() - 2 * day)
    expect(nextRewardChangeAt({ shopRewardChangedAt: recent }, now)).toEqual(new Date(recent.getTime() + 15 * day))
    expect(nextRewardChangeAt({ shopRewardChangedAt: new Date(now.getTime() - 16 * day) }, now)).toBeNull()
  })

  it("validates and trims", () => {
    expect(rewardChangeSchema.parse({ stampsForReward: 8, reward: "  Cookie " })).toEqual({
      stampsForReward: 8,
      reward: "Cookie",
    })
    expect(rewardChangeSchema.safeParse({ stampsForReward: 2.5, reward: "Cookie" }).success).toBe(false)
    expect(rewardChangeSchema.safeParse({ stampsForReward: 5, reward: "x".repeat(81) }).success).toBe(false)
    expect(sameReward({ stampsForReward: 8, reward: "Cookie" }, { stampsForReward: 8, reward: "Cookie" })).toBe(true)
    expect(sameReward({ stampsForReward: 8, reward: "Cookie" }, { stampsForReward: 9, reward: "Cookie" })).toBe(false)
  })

  it("the change is the card's news until the customer stamps or redeems again", () => {
    const changedAt = new Date(now.getTime() - day)
    const program = { rewardChangedAt: changedAt }
    expect(rewardChangedForCard({}, {})).toBe(false)
    expect(rewardChangedForCard({}, program)).toBe(true)
    expect(rewardChangedForCard({ lastStampAt: new Date(now.getTime() - 2 * day) }, program)).toBe(true)
    expect(rewardChangedForCard({ lastStampAt: now }, program)).toBe(false)
    expect(rewardChangedForCard({ lastRedeemAt: now }, program)).toBe(false)
  })

  it("tells the customer the new conditions on the card", () => {
    const base = { placeName: "Polvorín", reward: "Café con medialuna", rewardChanged: true }
    expect(stampNewsMessage({ ...base, stamps: 3, total: 8 })).toBe(
      "Nuevas condiciones en Polvorín: con 8 sellos te llevás Café con medialuna. Tenés 3: te faltan 5."
    )
    expect(stampNewsMessage({ ...base, stamps: 9, total: 8 })).toMatch(/¡Ya podés canjear tu premio!$/)
    expect(stampNewsMessage({ ...base, stamps: 0, total: 1 })).toBe(
      "Nuevas condiciones en Polvorín: con 1 sello te llevás Café con medialuna. Sumá tu primer sello en tu próxima visita."
    )
    // Sin cambio, el mensaje de siempre.
    expect(stampNewsMessage({ ...base, rewardChanged: false, stamps: 3, total: 8 })).toMatch(/^¡Sumaste un sello/)
  })
})
