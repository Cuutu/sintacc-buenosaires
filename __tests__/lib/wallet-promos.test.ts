/**
 * @jest-environment node
 */
import {
  argentinaClock,
  doubleStampSchema,
  doubleStampText,
  formatDays,
  isDoubleStampNow,
  promosSchema,
  promosUpdate,
  sameDoubleStamp,
  stampIncrement,
} from "@/lib/wallet/promos"
import { stampNewsMessage } from "@/lib/wallet/card-text"

// Miércoles 14/10/2026 a las 16:30 en Argentina (UTC-3).
const WEDNESDAY_1630 = new Date("2026-10-14T19:30:00Z")
const weekdays = { days: [1, 2, 3, 4, 5], fromHour: 15, toHour: 18 }

describe("sello doble", () => {
  it("uses Argentina's clock, not the server's", () => {
    expect(argentinaClock(WEDNESDAY_1630)).toEqual({ weekday: 3, hour: 16 })
    // 01:00 UTC del jueves = 22 h del miércoles en Argentina.
    expect(argentinaClock(new Date("2026-10-15T01:00:00Z"))).toEqual({ weekday: 3, hour: 22 })
  })

  it("is on only on the chosen days and hours", () => {
    expect(isDoubleStampNow(weekdays, WEDNESDAY_1630)).toBe(true)
    expect(isDoubleStampNow({ ...weekdays, days: [6, 0] }, WEDNESDAY_1630)).toBe(false)
    expect(isDoubleStampNow({ ...weekdays, toHour: 16 }, WEDNESDAY_1630)).toBe(false)
    expect(isDoubleStampNow({ ...weekdays, fromHour: 17 }, WEDNESDAY_1630)).toBe(false)
    expect(isDoubleStampNow(null, WEDNESDAY_1630)).toBe(false)
    expect(isDoubleStampNow(undefined)).toBe(false)
  })

  it("describes the promo in plain Spanish", () => {
    expect(formatDays([1, 2, 3, 4, 5])).toBe("de lunes a viernes")
    expect(formatDays([2, 4])).toBe("los martes y jueves")
    expect(formatDays([6, 0])).toBe("los sábados y domingos")
    expect(formatDays([0, 1, 2, 3, 4, 5, 6])).toBe("todos los días")
    expect(doubleStampText(weekdays)).toBe(
      "Sello doble de lunes a viernes de 15 a 18 h: cada visita suma 2 sellos."
    )
    expect(doubleStampText({ days: [3], fromHour: 0, toHour: 24 })).toBe(
      "Sello doble los miércoles todo el día: cada visita suma 2 sellos."
    )
    expect(doubleStampText(null)).toBeNull()
  })

  it("validates what the shop saves", () => {
    expect(doubleStampSchema.parse({ days: [3, 1, 1], fromHour: 9, toHour: 12 })).toEqual({
      days: [1, 3],
      fromHour: 9,
      toHour: 12,
    })
    expect(doubleStampSchema.safeParse({ days: [], fromHour: 9, toHour: 12 }).success).toBe(false)
    expect(doubleStampSchema.safeParse({ days: [1], fromHour: 18, toHour: 15 }).success).toBe(false)
    expect(doubleStampSchema.safeParse({ days: [7], fromHour: 1, toHour: 2 }).success).toBe(false)
    expect(promosSchema.parse({ selloDoble: null, traeUnAmigo: true })).toEqual({ selloDoble: null, traeUnAmigo: true })
    expect(promosSchema.safeParse({ selloDoble: null }).success).toBe(false)
    expect(promosUpdate({ selloDoble: null, traeUnAmigo: false })).toEqual({
      $set: { referralEnabled: false },
      $unset: { doubleStamp: 1 },
    })
    expect(promosUpdate({ selloDoble: weekdays, traeUnAmigo: true })).toEqual({
      $set: { doubleStamp: weekdays, referralEnabled: true },
    })
    expect(sameDoubleStamp(weekdays, { ...weekdays, days: [1, 2, 3, 4, 5] })).toBe(true)
    expect(sameDoubleStamp(weekdays, null)).toBe(false)
    expect(sameDoubleStamp(undefined, null)).toBe(true)
  })

  it("adds 2 stamps in the window, without going past the reward", () => {
    const program = { stampsForReward: 5, doubleStamp: weekdays }
    expect(stampIncrement({ stamps: 1 }, program, WEDNESDAY_1630)).toEqual({ added: 2, reason: "double" })
    expect(stampIncrement({ stamps: 4 }, program, WEDNESDAY_1630)).toEqual({ added: 1 })
    expect(stampIncrement({ stamps: 1 }, { stampsForReward: 5 }, WEDNESDAY_1630)).toEqual({ added: 1 })
    const saturday = new Date("2026-10-17T19:30:00Z")
    expect(stampIncrement({ stamps: 1 }, program, saturday)).toEqual({ added: 1 })
  })

  it("gives an invited friend one extra stamp on the first visit only", () => {
    const program = { stampsForReward: 5 }
    const invited = { stamps: 0, totalStamps: 0, referredBy: "c1" }
    expect(stampIncrement(invited, program, WEDNESDAY_1630)).toEqual({ added: 2, reason: "friend", friend: true })
    expect(stampIncrement(invited, { ...program, doubleStamp: weekdays }, WEDNESDAY_1630)).toEqual({
      added: 3,
      reason: "friend",
      friend: true,
    })
    expect(stampIncrement({ ...invited, referralRewardedAt: new Date() }, program)).toEqual({ added: 1 })
    expect(stampIncrement({ ...invited, stamps: 1, totalStamps: 1 }, program)).toEqual({ added: 1 })
    expect(stampIncrement({ stamps: 0, totalStamps: 0 }, program)).toEqual({ added: 1 })
    // Tarjeta de un solo sello: no hay lugar para el regalo, pero igual cuenta como primera visita.
    expect(stampIncrement(invited, { stampsForReward: 1 })).toEqual({ added: 1, friend: true })
  })

  it("tells the customer it was a double stamp", () => {
    const base = { total: 5, placeName: "Polvorín", reward: "Cookie" }
    expect(stampNewsMessage({ ...base, stamps: 3, lastStampAdded: 2, lastStampReason: "double" })).toBe(
      "¡Sello doble! Sumaste 2 sellos en Polvorín. Te faltan 2 para tu premio: Cookie."
    )
    expect(stampNewsMessage({ ...base, stamps: 5, lastStampAdded: 2, lastStampReason: "double" })).toBe(
      "¡Sello doble! Sumaste 2 sellos y completaste la tarjeta. Tu premio te espera en Polvorín: Cookie."
    )
    expect(stampNewsMessage({ ...base, stamps: 3 })).toBe(
      "¡Sumaste un sello en Polvorín! Te faltan 2 para tu premio: Cookie."
    )
    expect(stampNewsMessage({ ...base, stamps: 2, lastStampAdded: 2, lastStampReason: "friend" })).toBe(
      "¡Sumaste 2 sellos en Polvorín, uno de regalo por venir con un amigo! Te faltan 3 para tu premio: Cookie."
    )
    expect(stampNewsMessage({ ...base, stamps: 4, lastStampAdded: 1, lastStampReason: "inviter" })).toBe(
      "¡Tu amigo sumó su primer sello en Polvorín y te regalamos uno! Te falta 1 para tu premio: Cookie."
    )
    expect(stampNewsMessage({ ...base, stamps: 5, lastStampAdded: 1, lastStampReason: "inviter" })).toBe(
      "¡Tu amigo sumó su primer sello en Polvorín y te regalamos uno! ¡Completaste la tarjeta! Tu premio te espera: Cookie."
    )
    expect(stampNewsMessage({ ...base, stamps: 0, rewardsRedeemed: 1, lastStampReason: "double" })).toBe(
      "¡Canjeaste tu premio en Polvorín! Ya arrancás una tarjeta nueva."
    )
  })
})
