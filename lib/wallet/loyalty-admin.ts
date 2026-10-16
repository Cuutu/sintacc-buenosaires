/** Alta y edición de programas de sellos desde /admin/tarjetas. */

import { z } from "zod"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { Place } from "@/models/Place"
import { LoyaltyProgram } from "@/models/LoyaltyProgram"
import { enrollPathFor, getProgramStats, type ProgramStats } from "@/lib/wallet/loyalty"
import { formatNoticeTime } from "@/lib/wallet/notice"

const staffEmails = z
  .array(z.string().trim().toLowerCase().email("Mail inválido"))
  .max(10, "Máximo 10 mails")
  .transform((list) => Array.from(new Set(list)))

const fields = {
  stampsForReward: z.number().int().min(1).max(20),
  reward: z.string().trim().min(2, "Escribí el premio").max(80),
  staffEmails,
}

export const createProgramSchema = z.object({
  placeId: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), "Lugar inválido"),
  ...fields,
})

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
  active: boolean
  enrollPath: string
  stats: ProgramStats
  /** Último aviso del local, para que el admin vea qué le mandan a los clientes. */
  notice: { text: string; sentAt: string; byEmail: string } | null
}

export async function listProgramsForAdmin(): Promise<AdminProgramRow[]> {
  await connectDB()
  const programs = await LoyaltyProgram.find().sort({ createdAt: -1 }).limit(200).lean()
  const places = await Place.find({ _id: { $in: programs.map((p) => p.placeId) } })
    .select("name slug")
    .lean<Array<{ _id: mongoose.Types.ObjectId; name: string; slug?: string }>>()
  const byId = new Map(places.map((p) => [p._id.toString(), p]))
  const stats = await Promise.all(programs.map((p) => getProgramStats(p._id)))
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
      active: p.active,
      enrollPath: enrollPathFor(p._id.toString()),
      stats: stats[i],
      notice: p.notice
        ? { text: p.notice.text, sentAt: formatNoticeTime(new Date(p.notice.sentAt)), byEmail: p.notice.byEmail }
        : null,
    }
  })
}
