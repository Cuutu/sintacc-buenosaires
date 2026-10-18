/**
 * Avisos del local a sus clientes ("Salieron las medialunas sin TACC").
 * El aviso va al dorso de la tarjeta y el celu lo muestra en la pantalla bloqueada.
 * Uno por día por local, para que nadie desactive las notificaciones de la tarjeta.
 */

import { z } from "zod"
import type { LoyaltyNotice } from "@/models/LoyaltyProgram"

export const NOTICE_MAX_LENGTH = 140
/** Entre un aviso y el siguiente. Un poco menos de un día, para poder avisar siempre a la misma hora. */
export const NOTICE_COOLDOWN_MS = 20 * 60 * 60 * 1000
/** Después de una semana el aviso ya no se muestra (en la web ni en las tarjetas que se actualicen). */
export const NOTICE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Texto plano en una línea. No se escapa como HTML: el Wallet mostraría "&quot;" tal cual;
 * se sacan < y > y los caracteres de control, y la web lo muestra escapado por React.
 */
export function cleanNoticeText(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export const noticeSchema = z.object({
  texto: z
    .string()
    .transform(cleanNoticeText)
    .pipe(
      z
        .string()
        .min(3, "Escribí el aviso.")
        .max(NOTICE_MAX_LENGTH, `Máximo ${NOTICE_MAX_LENGTH} caracteres.`)
        .refine((text) => !/(https?:\/\/|www\.)/i.test(text), "Sin links: el aviso es sólo texto.")
    ),
})

/** El aviso vigente, o null si no hay o ya pasó una semana. */
export function activeNotice(notice: LoyaltyNotice | undefined | null, now = new Date()): string | null {
  if (!notice?.text) return null
  return now.getTime() - new Date(notice.sentAt).getTime() < NOTICE_TTL_MS ? notice.text : null
}

/** Desde cuándo se puede mandar el próximo aviso (null: ya se puede). */
export function nextNoticeAt(notice: LoyaltyNotice | undefined | null, now = new Date()): Date | null {
  if (!notice?.sentAt) return null
  const next = new Date(new Date(notice.sentAt).getTime() + NOTICE_COOLDOWN_MS)
  return next.getTime() > now.getTime() ? next : null
}

/** "16/10 18:30", siempre en hora de Argentina (igual en el servidor y en el celu). */
export function formatNoticeTime(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
}
