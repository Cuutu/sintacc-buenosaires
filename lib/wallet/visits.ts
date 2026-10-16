/**
 * Clientes por día de los últimos 7 días (en hora de Argentina), para el panel del local.
 * Cuenta personas (tarjetas distintas), no sellos: si a alguien le sellan dos veces el mismo
 * día, es un cliente.
 */

import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { LoyaltyStamp } from "@/models/LoyaltyStamp"
import { WEEKDAY_SHORT } from "@/lib/wallet/promos"

const TIME_ZONE = "America/Argentina/Buenos_Aires"
const DAY_MS = 24 * 60 * 60 * 1000

export type DayVisits = { date: string; label: string; visits: number; today: boolean }

export type WeekVisits = { days: DayVisits[]; /** Clientes distintos en los 7 días. */ total: number }

/** "2026-10-16" en Argentina. */
export function argentinaDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

/** Los últimos `days` días (el último es hoy), con 0 en los días sin visitas. */
export function fillLastDays(rows: Array<{ _id: string; visits: number }>, now = new Date(), days = 7): DayVisits[] {
  const byDate = new Map(rows.map((r) => [r._id, r.visits]))
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(now.getTime() - (days - 1 - i) * DAY_MS)
    const date = argentinaDate(day)
    // Mediodía de ese día en Argentina (UTC-3): sirve para saber qué día de la semana es.
    const weekday = new Date(`${date}T15:00:00Z`).getUTCDay()
    return { date, label: WEEKDAY_SHORT[weekday], visits: byDate.get(date) ?? 0, today: i === days - 1 }
  })
}

export async function getDailyVisits(programId: mongoose.Types.ObjectId, now = new Date()): Promise<WeekVisits> {
  await connectDB()
  const days = fillLastDays([], now)
  const [result] = await LoyaltyStamp.aggregate<{
    perDay: Array<{ _id: string; visits: number }>
    total: Array<{ total: number }>
  }>([
    // El sello de regalo del que invitó no es una visita.
    { $match: { programId, kind: "stamp", bonus: { $ne: "inviter" }, createdAt: { $gte: new Date(now.getTime() - 8 * DAY_MS) } } },
    { $set: { day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TIME_ZONE } } } },
    { $match: { day: { $gte: days[0].date } } },
    {
      $facet: {
        perDay: [
          { $group: { _id: { day: "$day", card: "$cardId" } } },
          { $group: { _id: "$_id.day", visits: { $sum: 1 } } },
        ],
        total: [{ $group: { _id: "$cardId" } }, { $count: "total" }],
      },
    },
  ])
  return { days: fillLastDays(result?.perDay ?? [], now), total: result?.total[0]?.total ?? 0 }
}
