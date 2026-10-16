/**
 * Sellos por mes de cada local (mes de Argentina). Es la base para decidir el tope gratis y el
 * precio del plan pago: todavía no se cobra nada, sólo se mide.
 * Se cuentan todos los sellos que entregó la tarjeta: los de cada visita, los del sello doble y
 * los de regalo de "Traé un amigo".
 */

import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { LoyaltyStamp } from "@/models/LoyaltyStamp"
import type { MonthStamps } from "@/lib/wallet/month-stats"

export { monthChange, type MonthStamps } from "@/lib/wallet/month-stats"

const TIME_ZONE = "America/Argentina/Buenos_Aires"
const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const

/** Cuántos meses se muestran (el último es el actual). */
export const MONTHS_SHOWN = 6

/** "2026-10" en Argentina. */
export function argentinaMonth(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit" }).formatToParts(date)
  const year = parts.find((p) => p.type === "year")?.value
  const month = parts.find((p) => p.type === "month")?.value
  return `${year}-${month}`
}

/** Los últimos `count` meses, del más viejo al actual: ["2026-05", …, "2026-10"]. */
export function lastMonths(now: Date, count = MONTHS_SHOWN): string[] {
  const [year, month] = argentinaMonth(now).split("-").map(Number)
  return Array.from({ length: count }, (_, i) => {
    const offset = month - 1 - (count - 1 - i)
    const y = year + Math.floor(offset / 12)
    const m = ((offset % 12) + 12) % 12
    return `${y}-${String(m + 1).padStart(2, "0")}`
  })
}

/** Primer instante de ese mes en Argentina (00:00, UTC-3). */
export function monthStart(month: string): Date {
  return new Date(`${month}-01T03:00:00Z`)
}

export function monthLabel(month: string): string {
  return MONTH_SHORT[Number(month.slice(5, 7)) - 1] ?? month
}

type Row = { _id: { program: mongoose.Types.ObjectId; month: string }; stamps: number; customers: number; redeems: number }

/** Arma la serie de cada programa con 0 en los meses sin movimiento. */
export function fillMonths(rows: Row[], programIds: string[], now = new Date()): Map<string, MonthStamps[]> {
  const months = lastMonths(now)
  const current = months[months.length - 1]
  const byKey = new Map(rows.map((r) => [`${r._id.program.toString()}|${r._id.month}`, r]))
  return new Map(
    programIds.map((id) => [
      id,
      months.map((month) => {
        const row = byKey.get(`${id}|${month}`)
        return {
          month,
          label: monthLabel(month),
          stamps: row?.stamps ?? 0,
          customers: row?.customers ?? 0,
          redeems: row?.redeems ?? 0,
          current: month === current,
        }
      }),
    ])
  )
}

/** Sellos, clientes y canjes por mes de los últimos 6 meses, para varios programas de una. */
export async function getMonthlyStamps(
  programIds: mongoose.Types.ObjectId[],
  now = new Date()
): Promise<Map<string, MonthStamps[]>> {
  const ids = programIds.map((id) => id.toString())
  if (programIds.length === 0) return new Map()
  await connectDB()
  const rows = await LoyaltyStamp.aggregate<Row>([
    { $match: { programId: { $in: programIds }, createdAt: { $gte: monthStart(lastMonths(now)[0]) } } },
    {
      $group: {
        _id: {
          program: "$programId",
          month: { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: TIME_ZONE } },
        },
        // Los registros de antes del sello doble no tienen count: valían 1.
        stamps: { $sum: { $cond: [{ $eq: ["$kind", "stamp"] }, { $ifNull: ["$count", 1] }, 0] } },
        cards: {
          $addToSet: {
            $cond: [{ $and: [{ $eq: ["$kind", "stamp"] }, { $ne: ["$bonus", "inviter"] }] }, "$cardId", "$$REMOVE"],
          },
        },
        redeems: { $sum: { $cond: [{ $eq: ["$kind", "redeem"] }, 1, 0] } },
      },
    },
    { $project: { stamps: 1, redeems: 1, customers: { $size: "$cards" } } },
  ])
  return fillMonths(rows, ids, now)
}
