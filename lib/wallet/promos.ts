/**
 * Promos de la tarjeta de sellos que arma el local desde /local.
 * Sello doble: en los días y horarios flojos que elige el local, cada visita suma 2 sellos.
 * Todo en hora de Argentina, igual en el servidor y en el celu.
 */

import { z } from "zod"
import type { DoubleStampWindow } from "@/models/LoyaltyProgram"
import type { StampReasonValue } from "@/models/LoyaltyCard"

const TIME_ZONE = "America/Argentina/Buenos_Aires"

/** 0 = domingo, como Date.getDay(). */
export const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const
export const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const
/** Orden en que se muestran (la semana arranca el lunes). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

export const doubleStampSchema = z
  .object({
    days: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Elegí al menos un día.")
      .max(7)
      .transform((days) => Array.from(new Set(days)).sort((a, b) => a - b)),
    fromHour: z.number().int().min(0).max(23),
    toHour: z.number().int().min(1).max(24),
  })
  .refine((w) => w.fromHour < w.toHour, "El horario tiene que terminar después de empezar.")

/** Día de la semana y hora en Argentina. */
export function argentinaClock(now: Date): { weekday: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now)
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    parts.find((p) => p.type === "weekday")?.value ?? ""
  )
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? NaN)
  return { weekday, hour }
}

export function isDoubleStampNow(window: DoubleStampWindow | null | undefined, now = new Date()): boolean {
  if (!window || window.days.length === 0) return false
  const { weekday, hour } = argentinaClock(now)
  return window.days.includes(weekday) && hour >= window.fromHour && hour < window.toHour
}

function joinSpanish(items: string[]): string {
  if (items.length <= 1) return items.join("")
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`
}

/** "de lunes a viernes", "los martes y jueves", "todos los días". */
export function formatDays(days: number[]): string {
  const set = new Set(days)
  if (set.size === 7) return "todos los días"
  const ordered = WEEK_ORDER.filter((d) => set.has(d))
  const positions = ordered.map((d) => WEEK_ORDER.indexOf(d))
  const consecutive = positions.every((p, i) => i === 0 || p === positions[i - 1] + 1)
  if (ordered.length >= 3 && consecutive) {
    return `de ${WEEKDAYS[ordered[0]]} a ${WEEKDAYS[ordered[ordered.length - 1]]}`
  }
  // "los sábados", "los martes y jueves" (sábado y domingo llevan s en plural).
  const plural = (d: number) => (d === 0 || d === 6 ? `${WEEKDAYS[d]}s` : WEEKDAYS[d])
  return `los ${joinSpanish(ordered.map(plural))}`
}

export function formatHours(fromHour: number, toHour: number): string {
  if (fromHour === 0 && toHour === 24) return "todo el día"
  return `de ${fromHour} a ${toHour} h`
}

/** "Sello doble de lunes a viernes de 15 a 18 h." */
export function doubleStampText(window: DoubleStampWindow | null | undefined): string | null {
  if (!window || window.days.length === 0) return null
  return `Sello doble ${formatDays(window.days)} ${formatHours(window.fromHour, window.toHour)}: cada visita suma 2 sellos.`
}

/** Por qué se sumaron más sellos de lo normal (para el mensaje de la tarjeta). */
export type StampReason = StampReasonValue

export type StampIncrement = { added: number; reason?: StampReason }

/** Cuántos sellos suma esta visita: 1, o 2 en horario de sello doble (sin pasar del total). */
export function stampIncrement(
  card: { stamps: number },
  program: { stampsForReward: number; doubleStamp?: DoubleStampWindow | null },
  now = new Date()
): StampIncrement {
  const room = Math.max(0, program.stampsForReward - card.stamps)
  const double = isDoubleStampNow(program.doubleStamp, now)
  const added = Math.min(double ? 2 : 1, room)
  return double && added >= 2 ? { added, reason: "double" } : { added }
}

/** Lo que guarda el local desde /local. selloDoble null = sin sello doble. */
export const promosSchema = z.object({
  selloDoble: doubleStampSchema.nullable(),
})

export type PromosInput = z.infer<typeof promosSchema>

/** El update de Mongo para guardar las promos. */
export function promosUpdate(input: PromosInput) {
  return input.selloDoble
    ? { $set: { doubleStamp: input.selloDoble } }
    : { $unset: { doubleStamp: 1 } }
}

export function sameDoubleStamp(a: DoubleStampWindow | null | undefined, b: DoubleStampWindow | null | undefined) {
  if (!a || !b) return !a && !b
  return (
    a.fromHour === b.fromHour &&
    a.toHour === b.toHour &&
    a.days.length === b.days.length &&
    a.days.every((d, i) => d === b.days[i])
  )
}
