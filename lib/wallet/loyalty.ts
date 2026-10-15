/**
 * Tarjeta de sellos: reglas de negocio y acceso a datos.
 * El local escanea el QR de la tarjeta del cliente con la cámara del celular;
 * el QR abre /local/sellar/<serial>, donde sólo el personal del local puede sumar.
 */

import crypto from "crypto"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { absoluteUrl } from "@/lib/base-url"
import { getPlacePath } from "@/lib/place-url"
import { Place } from "@/models/Place"
import { LoyaltyProgram, type ILoyaltyProgram } from "@/models/LoyaltyProgram"
import { LoyaltyCard, type ILoyaltyCard, type LoyaltyWallet } from "@/models/LoyaltyCard"
import { LoyaltyStamp } from "@/models/LoyaltyStamp"
import type { LoyaltyPassInput } from "@/lib/wallet/apple-pass"

/** Evita sellos dobles por tocar dos veces o escanear de nuevo. */
export const STAMP_COOLDOWN_MS = 60_000

/** Base del servicio web de Apple; Apple le agrega /v1/... */
export const APPLE_WEB_SERVICE_PATH = "/api/wallet/apple"

export const SERIAL_PATTERN = /^[a-f0-9]{32}$/

export function newSerialNumber(): string {
  return crypto.randomBytes(16).toString("hex")
}

export function newAuthToken(): string {
  return crypto.randomBytes(24).toString("hex")
}

export function isValidSerial(value: unknown): value is string {
  return typeof value === "string" && SERIAL_PATTERN.test(value)
}

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase()
}

/** Lo que va en el QR de la tarjeta. */
export function stampUrlFor(serialNumber: string): string {
  return absoluteUrl(`/local/sellar/${serialNumber}`)
}

export function enrollPathFor(programId: string): string {
  return `/tarjeta/${programId}`
}

export type StaffSession = { user?: { email?: string | null; role?: string } } | null

export function canManageProgram(
  program: Pick<ILoyaltyProgram, "staffEmails">,
  session: StaffSession
): boolean {
  if (!session?.user) return false
  if (session.user.role === "admin") return true
  const email = normalizeEmail(session.user.email)
  return Boolean(email) && program.staffEmails.includes(email)
}

export type ProgramWithPlace = {
  program: ILoyaltyProgram
  placeName: string
  placePath: string
}

export async function getProgramWithPlace(programId: string): Promise<ProgramWithPlace | null> {
  if (!mongoose.Types.ObjectId.isValid(programId)) return null
  await connectDB()
  const program = await LoyaltyProgram.findById(programId)
  if (!program) return null
  const place = await Place.findById(program.placeId).select("name slug").lean<{
    _id: mongoose.Types.ObjectId
    name: string
    slug?: string
  }>()
  if (!place) return null
  return { program, placeName: place.name, placePath: getPlacePath(place) }
}

export async function createCard(
  programId: mongoose.Types.ObjectId,
  wallet: LoyaltyWallet = "apple"
): Promise<ILoyaltyCard> {
  await connectDB()
  return LoyaltyCard.create({
    programId,
    serialNumber: newSerialNumber(),
    authToken: newAuthToken(),
    wallet,
  })
}

export function passInputFor(card: ILoyaltyCard, data: ProgramWithPlace): LoyaltyPassInput {
  return {
    serialNumber: card.serialNumber,
    barcodeValue: stampUrlFor(card.serialNumber),
    stamps: card.stamps,
    stampsForReward: data.program.stampsForReward,
    reward: data.program.reward,
    placeName: data.placeName,
    placePath: data.placePath,
    rewardsRedeemed: card.rewardsRedeemed,
    webService: {
      url: absoluteUrl(APPLE_WEB_SERVICE_PATH),
      authenticationToken: card.authToken,
    },
  }
}

export type StampResult =
  | { ok: true; card: ILoyaltyCard }
  | { ok: false; reason: "not_found" | "full" | "too_soon" | "not_ready" }

/** Suma un sello de forma atómica (no pasa del máximo ni duplica en el cooldown). */
export async function addStamp(
  card: ILoyaltyCard,
  program: ILoyaltyProgram,
  byEmail: string,
  now = new Date()
): Promise<StampResult> {
  if (card.stamps >= program.stampsForReward) return { ok: false, reason: "full" }
  const updated = await LoyaltyCard.findOneAndUpdate(
    {
      _id: card._id,
      stamps: { $lt: program.stampsForReward },
      $or: [
        { lastStampAt: { $exists: false } },
        { lastStampAt: { $lt: new Date(now.getTime() - STAMP_COOLDOWN_MS) } },
      ],
    },
    { $inc: { stamps: 1, totalStamps: 1 }, $set: { lastStampAt: now } },
    { new: true }
  )
  if (!updated) return { ok: false, reason: "too_soon" }
  await LoyaltyStamp.create({ programId: program._id, cardId: card._id, kind: "stamp", byEmail })
  return { ok: true, card: updated }
}

/** Canjea el premio: vuelve los sellos a 0. */
export async function redeemReward(
  card: ILoyaltyCard,
  program: ILoyaltyProgram,
  byEmail: string
): Promise<StampResult> {
  const updated = await LoyaltyCard.findOneAndUpdate(
    { _id: card._id, stamps: { $gte: program.stampsForReward } },
    { $set: { stamps: 0 }, $inc: { rewardsRedeemed: 1 } },
    { new: true }
  )
  if (!updated) return { ok: false, reason: "not_ready" }
  await LoyaltyStamp.create({ programId: program._id, cardId: card._id, kind: "redeem", byEmail })
  return { ok: true, card: updated }
}

export type ProgramStats = {
  cards: number
  cardsWithSecondStamp: number
  stampsLast7Days: number
  redeems: number
}

export async function getProgramStats(
  programId: mongoose.Types.ObjectId,
  now = new Date()
): Promise<ProgramStats> {
  await connectDB()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [cards, cardsWithSecondStamp, stampsLast7Days, redeems] = await Promise.all([
    LoyaltyCard.countDocuments({ programId }),
    LoyaltyCard.countDocuments({ programId, totalStamps: { $gte: 2 } }),
    LoyaltyStamp.countDocuments({ programId, kind: "stamp", createdAt: { $gte: weekAgo } }),
    LoyaltyStamp.countDocuments({ programId, kind: "redeem" }),
  ])
  return { cards, cardsWithSecondStamp, stampsLast7Days, redeems }
}

/** Comparación en tiempo constante del token que manda el Wallet. */
export function safeTokenEquals(expected: string, received: string): boolean {
  const a = Buffer.from(expected)
  const b = Buffer.from(received)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/** "ApplePass <token>" → token */
export function parseApplePassAuth(header: string | null): string | null {
  const match = header?.match(/^ApplePass\s+(\S+)$/)
  return match ? match[1] : null
}
