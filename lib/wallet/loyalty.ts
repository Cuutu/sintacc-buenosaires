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
import { LoyaltyDevice } from "@/models/LoyaltyDevice"
import type { LoyaltyPassInput, PassLocation } from "@/lib/wallet/apple-pass"
import { cardSafetyFor, type CardSafety } from "@/lib/wallet/card-safety"
import { activeNotice, nextNoticeAt, NOTICE_COOLDOWN_MS } from "@/lib/wallet/notice"
import { argentinaDate } from "@/lib/wallet/visits"
import { commonSafety, MAX_PASS_LOCATIONS, programPlaceIds } from "@/lib/wallet/branches"
import { rewardChangedForCard } from "@/lib/wallet/reward-change"
import {
  doubleStampText,
  REFERRAL_MAX_PER_CARD,
  stampIncrement,
  type StampReason,
} from "@/lib/wallet/promos"

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

/** Link de "Traé un amigo": la página de la tarjeta con la tarjeta de quien invita. */
export function inviteUrlFor(programId: string, cardId: string): string {
  return absoluteUrl(`${enrollPathFor(programId)}?amigo=${encodeURIComponent(cardId)}`)
}

/**
 * La tarjeta de quien invita, si el link es de este local y la promo está activa.
 * Devuelve su _id o null (link viejo, de otro local o inventado).
 */
export async function findInviterCard(
  program: Pick<ILoyaltyProgram, "_id" | "referralEnabled">,
  amigo: string | null | undefined
): Promise<mongoose.Types.ObjectId | null> {
  if (!program.referralEnabled || !amigo || !mongoose.Types.ObjectId.isValid(amigo)) return null
  await connectDB()
  const inviter = await LoyaltyCard.exists({ _id: amigo, programId: program._id })
  return inviter ? new mongoose.Types.ObjectId(amigo) : null
}

export type StaffSession = { user?: { email?: string | null; role?: string } } | null

/**
 * Encargado del programa (o admin): avisos, promos y sellos en todas las sucursales.
 * El personal de una sucursal sólo suma sellos: ver canStampProgram en branches.ts.
 */
export function canManageProgram(
  program: Pick<ILoyaltyProgram, "staffEmails">,
  session: StaffSession
): boolean {
  if (!session?.user) return false
  if (session.user.role === "admin") return true
  const email = normalizeEmail(session.user.email)
  return Boolean(email) && program.staffEmails.includes(email)
}

/** Una sucursal (o el local, si no hay sucursales). */
export type BranchInfo = {
  placeId: string
  name: string
  path: string
  safety: CardSafety | null
  location: PassLocation | null
  main: boolean
}

export type ProgramWithPlace = {
  program: ILoyaltyProgram
  /** Lo que dice la tarjeta: la marca si hay sucursales, si no el nombre del local. */
  placeName: string
  /** Ficha del local principal. */
  placePath: string
  /** 100% sin TACC o con opciones, como en el mapa; null si no hay info o las sucursales difieren. */
  safety: CardSafety | null
  /** Dónde avisar al pasar cerca: una por sucursal con ubicación exacta (hasta 10). */
  locations: PassLocation[]
  /** Todas las sucursales, la principal primero. */
  branches: BranchInfo[]
}

/**
 * Coordenadas del local para la tarjeta. Si la ubicación del mapa es aproximada,
 * no se usa: el aviso saltaría en otra cuadra.
 */
export function passLocationFor(place: {
  location?: { lat?: number; lng?: number }
  locationPrecision?: string
}): PassLocation | null {
  const lat = place.location?.lat
  const lng = place.location?.lng
  if (place.locationPrecision === "approx") return null
  if (typeof lat !== "number" || typeof lng !== "number") return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null
  return { latitude: lat, longitude: lng }
}

type PlaceForCard = {
  _id: mongoose.Types.ObjectId
  name: string
  slug?: string
  safetyLevel?: Parameters<typeof cardSafetyFor>[0]["safetyLevel"]
  tags?: string[]
  location?: { lat?: number; lng?: number }
  locationPrecision?: string
}

export async function getProgramWithPlace(programId: string): Promise<ProgramWithPlace | null> {
  if (!mongoose.Types.ObjectId.isValid(programId)) return null
  await connectDB()
  const program = await LoyaltyProgram.findById(programId)
  if (!program) return null
  const ids = programPlaceIds(program)
  const places = await Place.find({ _id: { $in: ids } })
    .select("name slug safetyLevel tags location locationPrecision")
    .lean<PlaceForCard[]>()
  const byId = new Map(places.map((p) => [p._id.toString(), p]))
  const main = byId.get(program.placeId.toString())
  if (!main) return null
  const branches: BranchInfo[] = ids
    .map((id) => byId.get(id))
    .filter((p): p is PlaceForCard => Boolean(p))
    .map((p) => ({
      placeId: p._id.toString(),
      name: p.name,
      path: getPlacePath(p),
      safety: cardSafetyFor(p),
      location: passLocationFor(p),
      main: p._id.toString() === program.placeId.toString(),
    }))
  return {
    program,
    placeName: program.brandName?.trim() || main.name,
    placePath: getPlacePath(main),
    safety: commonSafety(branches.map((b) => b.safety)),
    locations: branches
      .filter((b) => b.location)
      .slice(0, MAX_PASS_LOCATIONS)
      .map((b) => ({ ...(b.location as PassLocation), ...(branches.length > 1 ? { name: b.name } : {}) })),
    branches,
  }
}

export async function createCard(
  programId: mongoose.Types.ObjectId,
  wallet: LoyaltyWallet = "apple",
  referredBy: mongoose.Types.ObjectId | null = null,
  requestKey: string | null = null
): Promise<ILoyaltyCard> {
  await connectDB()
  return LoyaltyCard.create({
    programId,
    serialNumber: newSerialNumber(),
    authToken: newAuthToken(),
    wallet,
    ...(referredBy ? { referredBy } : {}),
    ...(requestKey ? { requestKey } : {}),
  })
}

/** Código del botón "Agregar" (uno por botón y por visita a la página). */
export const REQUEST_KEY_PATTERN = /^[A-Za-z0-9_-]{12,40}$/

export function newRequestKey(): string {
  return crypto.randomBytes(12).toString("base64url")
}

export function passInputFor(card: ILoyaltyCard, data: ProgramWithPlace, now = new Date()): LoyaltyPassInput {
  return {
    serialNumber: card.serialNumber,
    barcodeValue: stampUrlFor(card.serialNumber),
    stamps: card.stamps,
    stampsForReward: data.program.stampsForReward,
    reward: data.program.reward,
    placeName: data.placeName,
    placePath: data.placePath,
    safety: data.safety,
    locations: data.locations,
    branchNames: data.branches.length > 1 ? data.branches.map((b) => b.name) : [],
    notice: activeNotice(data.program.notice, now),
    doubleStamp: doubleStampText(data.program.doubleStamp),
    inviteUrl: data.program.referralEnabled
      ? inviteUrlFor(data.program._id.toString(), card._id.toString())
      : null,
    rewardsRedeemed: card.rewardsRedeemed,
    lastStampAdded: card.lastStampAdded,
    lastStampReason: card.lastStampReason,
    rewardChanged: rewardChangedForCard(card, data.program),
    webService: {
      url: absoluteUrl(APPLE_WEB_SERVICE_PATH),
      authenticationToken: card.authToken,
    },
  }
}

export type StampResult =
  | {
      ok: true
      card: ILoyaltyCard
      added: number
      bonus?: StampReason
      /** La tarjeta del amigo que lo invitó, si ganó su sello de regalo. */
      inviter?: ILoyaltyCard
    }
  | { ok: false; reason: "not_found" | "full" | "too_soon" | "not_ready" }

/**
 * Le da al que invitó su sello de regalo (atómico, con tope y sin pasar del premio).
 * Si tiene la tarjeta completa o llegó al tope, no suma.
 */
async function rewardInviter(
  inviterId: mongoose.Types.ObjectId,
  program: ILoyaltyProgram,
  byEmail: string
): Promise<ILoyaltyCard | null> {
  const inviter = await LoyaltyCard.findOneAndUpdate(
    {
      _id: inviterId,
      programId: program._id,
      stamps: { $lt: program.stampsForReward },
      $or: [
        { referralsRewarded: { $exists: false } },
        { referralsRewarded: { $lt: REFERRAL_MAX_PER_CARD } },
      ],
    },
    {
      $inc: { stamps: 1, totalStamps: 1, referralsRewarded: 1 },
      $set: { lastStampAdded: 1, lastStampReason: "inviter" },
    },
    { new: true }
  )
  if (!inviter) return null
  await LoyaltyStamp.create({
    programId: program._id,
    cardId: inviter._id,
    kind: "stamp",
    count: 1,
    bonus: "inviter",
    byEmail,
  })
  return inviter
}

/**
 * Suma los sellos de una visita de forma atómica: 1, o 2 en horario de sello doble, más uno de
 * regalo en el primer sello de alguien que vino invitado (y otro para su amigo). Sin pasar del
 * máximo ni duplicar en el cooldown. Si la tarjeta cambió en el medio, no suma.
 */
export async function addStamp(
  card: ILoyaltyCard,
  program: ILoyaltyProgram,
  byEmail: string,
  now = new Date(),
  /** Sucursal donde se suma (si no, la principal). */
  placeId?: string | null
): Promise<StampResult> {
  const stampPlace = placeId && mongoose.Types.ObjectId.isValid(placeId) ? { placeId } : {}
  if (card.stamps >= program.stampsForReward) return { ok: false, reason: "full" }
  const { added, reason, friend } = stampIncrement(card, program, now)
  // "Volvieron" cuenta días distintos: dos sellos el mismo día son una sola visita.
  const sameDay = card.lastStampAt ? argentinaDate(new Date(card.lastStampAt)) === argentinaDate(now) : false
  const updated = await LoyaltyCard.findOneAndUpdate(
    {
      _id: card._id,
      stamps: card.stamps,
      // El regalo por venir invitado se da una sola vez.
      ...(friend ? { referralRewardedAt: { $exists: false } } : {}),
      $or: [
        { lastStampAt: { $exists: false } },
        { lastStampAt: { $lt: new Date(now.getTime() - STAMP_COOLDOWN_MS) } },
      ],
    },
    {
      $inc: { stamps: added, totalStamps: added, ...(sameDay ? {} : { visits: 1 }) },
      $set: {
        lastStampAt: now,
        lastStampAdded: added,
        ...(reason ? { lastStampReason: reason } : {}),
        ...(friend ? { referralRewardedAt: now } : {}),
      },
      ...(reason ? {} : { $unset: { lastStampReason: 1 } }),
    },
    { new: true }
  )
  if (!updated) return { ok: false, reason: "too_soon" }
  await LoyaltyStamp.create({
    programId: program._id,
    cardId: card._id,
    kind: "stamp",
    count: added,
    ...(reason ? { bonus: reason } : {}),
    ...stampPlace,
    byEmail,
  })
  const inviter = friend && card.referredBy ? await rewardInviter(card.referredBy, program, byEmail) : null
  return {
    ok: true,
    card: updated,
    added,
    ...(reason ? { bonus: reason } : {}),
    ...(inviter ? { inviter } : {}),
  }
}

/** Canjea el premio: vuelve los sellos a 0. */
export async function redeemReward(
  card: ILoyaltyCard,
  program: ILoyaltyProgram,
  byEmail: string,
  /** Sucursal donde se canjea (si no, la principal). */
  placeId?: string | null
): Promise<StampResult> {
  const updated = await LoyaltyCard.findOneAndUpdate(
    { _id: card._id, stamps: { $gte: program.stampsForReward } },
    { $set: { stamps: 0, lastRedeemAt: new Date() }, $inc: { rewardsRedeemed: 1 } },
    { new: true }
  )
  if (!updated) return { ok: false, reason: "not_ready" }
  await LoyaltyStamp.create({
    programId: program._id,
    cardId: card._id,
    kind: "redeem",
    ...(placeId && mongoose.Types.ObjectId.isValid(placeId) ? { placeId } : {}),
    byEmail,
  })
  return { ok: true, card: updated, added: 0 }
}

export type SaveNoticeResult =
  | { ok: true; program: ILoyaltyProgram }
  | { ok: false; reason: "paused" | "too_soon"; nextAt?: Date }

/** Guarda el aviso si el programa está activo y pasó el tiempo desde el anterior (atómico). */
export async function saveProgramNotice(
  programId: mongoose.Types.ObjectId,
  text: string,
  byEmail: string,
  now = new Date()
): Promise<SaveNoticeResult> {
  await connectDB()
  const updated = await LoyaltyProgram.findOneAndUpdate(
    {
      _id: programId,
      active: true,
      $or: [
        { "notice.sentAt": { $exists: false } },
        { "notice.sentAt": { $lte: new Date(now.getTime() - NOTICE_COOLDOWN_MS) } },
      ],
    },
    { $set: { notice: { text, sentAt: now, byEmail } } },
    { new: true }
  )
  if (updated) return { ok: true, program: updated }
  const current = await LoyaltyProgram.findById(programId).select("active notice").lean<ILoyaltyProgram>()
  if (!current?.active) return { ok: false, reason: "paused" }
  return { ok: false, reason: "too_soon", nextAt: nextNoticeAt(current.notice, now) ?? undefined }
}

export type ProgramStats = {
  cards: number
  cardsWithSecondStamp: number
  stampsLast7Days: number
  redeems: number
  /** Tarjetas que llegaron con el link de un amigo. */
  invitedCards: number
  /**
   * Clientes = tarjetas que sumaron al menos un sello. "cards" cuenta todas las creadas: una
   * persona puede crear varias (tocar Agregar y no guardarla, Apple y Google, otro navegador).
   */
  customers: number
  /**
   * Tienen la tarjeta guardada en el Wallet: son los que reciben los avisos.
   * Apple: el iPhone se registra al guardarla (y se borra el registro si la sacan).
   * Google: no avisa cuándo la guardan; se cuentan las tarjetas de Google creadas.
   */
  inWallet: number
}

/** Tarjetas guardadas en un Wallet (ver ProgramStats.inWallet). */
export async function countCardsInWallet(programId: mongoose.Types.ObjectId): Promise<number> {
  await connectDB()
  const [appleSerials, google] = await Promise.all([
    LoyaltyCard.find({ programId, wallet: { $ne: "google" } }).distinct("serialNumber"),
    LoyaltyCard.countDocuments({ programId, wallet: "google" }),
  ])
  // iPhones distintos: si alguien guardó dos tarjetas del mismo local, cuenta una vez.
  const apple =
    appleSerials.length > 0
      ? (await LoyaltyDevice.distinct("deviceLibraryIdentifier", { serialNumber: { $in: appleSerials } })).length
      : 0
  return apple + google
}

export async function getProgramStats(
  programId: mongoose.Types.ObjectId,
  now = new Date()
): Promise<ProgramStats> {
  await connectDB()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [cards, customers, cardsWithSecondStamp, stampsLast7Days, redeems, invitedCards, inWallet] = await Promise.all([
    LoyaltyCard.countDocuments({ programId }),
    LoyaltyCard.countDocuments({ programId, totalStamps: { $gte: 1 } }),
    // Volvieron = 2+ visitas (con sello doble una sola visita ya suma 2 sellos).
    // Las tarjetas de antes de contar visitas no tienen el campo: ahí, 2+ sellos.
    LoyaltyCard.countDocuments({
      programId,
      $or: [{ visits: { $gte: 2 } }, { visits: { $exists: false }, totalStamps: { $gte: 2 } }],
    }),
    // Visitas: el sello de regalo del que invitó no cuenta como visita.
    LoyaltyStamp.countDocuments({
      programId,
      kind: "stamp",
      bonus: { $ne: "inviter" },
      createdAt: { $gte: weekAgo },
    }),
    LoyaltyStamp.countDocuments({ programId, kind: "redeem" }),
    // Invitados que ya vinieron (sumaron su primer sello), no los que sólo abrieron el link.
    LoyaltyCard.countDocuments({ programId, referredBy: { $exists: true }, totalStamps: { $gte: 1 } }),
    countCardsInWallet(programId),
  ])
  return { cards, customers, cardsWithSecondStamp, stampsLast7Days, redeems, invitedCards, inWallet }
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
