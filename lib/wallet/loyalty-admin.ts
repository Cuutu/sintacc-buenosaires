/** Alta y edición de programas de sellos desde /admin/tarjetas. */

import { z } from "zod"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { LoyaltyCard } from "@/models/LoyaltyCard"
import { LoyaltyStamp } from "@/models/LoyaltyStamp"
import { LoyaltyDevice } from "@/models/LoyaltyDevice"
import { enrollPathFor, getProgramStats, type ProgramStats } from "@/lib/wallet/loyalty"
import { formatNoticeTime } from "@/lib/wallet/notice"
import { doubleStampText } from "@/lib/wallet/promos"
import { getMonthlyStamps, type MonthStamps } from "@/lib/wallet/monthly"
import { MAX_BRANCHES } from "@/lib/wallet/branches"

const staffEmails = z
  .array(z.string().trim().toLowerCase().email("Mail inválido"))
  .max(10, "Máximo 10 mails")
  .transform((list) => Array.from(new Set(list)))

const objectId = z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Lugar inválido")

const branches = z
  .array(z.object({ placeId: objectId, staffEmails }))
  .max(MAX_BRANCHES, `Máximo ${MAX_BRANCHES} sucursales`)
  .refine((list) => new Set(list.map((b) => b.placeId)).size === list.length, "Hay una sucursal repetida")

const fields = {
  stampsForReward: z.number().int().min(1).max(20),
  reward: z.string().trim().min(2, "Escribí el premio").max(80),
  staffEmails,
  /** Nombre en la tarjeta si hay sucursales. Vacío = el nombre del local. */
  brandName: z.string().trim().max(60).optional(),
  branches,
}

export const createProgramSchema = z
  .object({ placeId: objectId, ...fields, branches: branches.default([]) })
  .refine((v) => !v.branches.some((b) => b.placeId === v.placeId), "El local principal no va como sucursal")

/**
 * ¿Alguno de estos lugares ya está en otro programa (como principal o como sucursal)?
 * Un lugar, una tarjeta.
 */
export async function placesTakenByOtherProgram(
  placeIds: string[],
  exceptProgramId?: string
): Promise<boolean> {
  await connectDB()
  const ids = placeIds.map((id) => new mongoose.Types.ObjectId(id))
  return Boolean(
    await LoyaltyProgram.exists({
      ...(exceptProgramId ? { _id: { $ne: exceptProgramId } } : {}),
      $or: [{ placeId: { $in: ids } }, { "branches.placeId": { $in: ids } }],
    })
  )
}

/** Cuántos de estos lugares existen (para no guardar sucursales inventadas). */
export async function countExistingPlaces(placeIds: string[]): Promise<number> {
  await connectDB()
  return Place.countDocuments({ _id: { $in: placeIds } })
}

export const updateProgramSchema = z
  .object({ ...fields, active: z.boolean() })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nada para actualizar")

export type AdminProgramRow = {
  id: string
  placeId: string
  placeName: string
  placeSlug?: string
  stampsForReward: number
  reward: string
  staffEmails: string[]
  brandName: string
  /** Otras sucursales (el principal es placeId). */
  branches: Array<{ placeId: string; name: string; staffEmails: string[] }>
  active: boolean
  enrollPath: string
  stats: ProgramStats
  /** Último aviso del local, para que el admin vea qué le mandan a los clientes. */
  notice: { text: string; sentAt: string; byEmail: string } | null
  /** Promos que armó el local desde /local. */
  doubleStamp: string | null
  referralEnabled: boolean
  /** Sellos por mes, últimos 6 (base del plan pago). */
  monthly: MonthStamps[]
}

export async function listProgramsForAdmin(): Promise<AdminProgramRow[]> {
  await connectDB()
  const programs = await LoyaltyProgram.find().sort({ createdAt: -1 }).limit(200).lean()
  const places = await Place.find({
    _id: { $in: programs.flatMap((p) => [p.placeId, ...(p.branches ?? []).map((b) => b.placeId)]) },
  })
    .select("name slug")
    .lean<Array<{ _id: mongoose.Types.ObjectId; name: string; slug?: string }>>()
  const byId = new Map(places.map((p) => [p._id.toString(), p]))
  const [stats, monthly] = await Promise.all([
    Promise.all(programs.map((p) => getProgramStats(p._id))),
    getMonthlyStamps(programs.map((p) => p._id)),
  ])
  return programs.map((p, i) => {
    const place = byId.get(p.placeId.toString())
    return {
      id: p._id.toString(),
      placeId: p.placeId.toString(),
      placeName: place?.name ?? "Lugar no encontrado",
      placeSlug: place?.slug,
      stampsForReward: p.stampsForReward,
      reward: p.reward,
      staffEmails: p.staffEmails,
      brandName: p.brandName ?? "",
      branches: (p.branches ?? []).map((b) => ({
        placeId: b.placeId.toString(),
        name: byId.get(b.placeId.toString())?.name ?? "Lugar no encontrado",
        staffEmails: b.staffEmails,
      })),
      active: p.active,
      enrollPath: enrollPathFor(p._id.toString()),
      stats: stats[i],
      notice: p.notice
        ? { text: p.notice.text, sentAt: formatNoticeTime(new Date(p.notice.sentAt)), byEmail: p.notice.byEmail }
        : null,
      doubleStamp: doubleStampText(p.doubleStamp),
      referralEnabled: Boolean(p.referralEnabled),
      monthly: monthly.get(p._id.toString()) ?? [],
    }
  })
}

/** Lo que hay que escribir para confirmar el borrado (no se puede deshacer). */
export const DELETE_CONFIRMATION = "BORRAR"

export const deleteProgramSchema = z.object({
  confirmar: z.literal(DELETE_CONFIRMATION, {
    errorMap: () => ({ message: `Escribí ${DELETE_CONFIRMATION} para confirmar.` }),
  }),
})

export type DeletedProgram = { cards: number; stamps: number; googleSerials: string[] }

/**
 * Borra el programa de un local con sus tarjetas, sellos y registros de iPhones.
 * Para locales de prueba o que dejaron de participar. Las tarjetas que los clientes ya
 * guardaron quedan en su Wallet pero no se actualizan más (las de Google se vencen aparte).
 * Devuelve null si no existe.
 */
export async function deleteProgram(programId: string): Promise<DeletedProgram | null> {
  if (!mongoose.Types.ObjectId.isValid(programId)) return null
  await connectDB()
  const program = await LoyaltyProgram.findById(programId).select("_id").lean()
  if (!program) return null
  const cards = await LoyaltyCard.find({ programId: program._id })
    .select("serialNumber wallet")
    .lean<Array<{ serialNumber: string; wallet?: string }>>()
  const serials = cards.map((c) => c.serialNumber)
  // El programa primero: desde acá nadie puede sacar ni sellar tarjetas nuevas.
  await LoyaltyProgram.deleteOne({ _id: program._id })
  const [, stamps] = await Promise.all([
    serials.length > 0 ? LoyaltyDevice.deleteMany({ serialNumber: { $in: serials } }) : null,
    LoyaltyStamp.deleteMany({ programId: program._id }),
  ])
  await LoyaltyCard.deleteMany({ programId: program._id })
  return {
    cards: cards.length,
    stamps: stamps?.deletedCount ?? 0,
    googleSerials: cards.filter((c) => c.wallet === "google").map((c) => c.serialNumber),
  }
}
