/**
 * Emails para sugerencias: admin (nueva) y usuario (aprobada).
 * Envío: lib/email-send (Resend). Requiere RESEND_API_KEY y RESEND_FROM_DOMAIN verificado.
 */

import { sendCelimapEmail } from "@/lib/email-send"
import { getBaseUrl } from "@/lib/base-url"
import {
  emailDetails,
  emailFallbackLink,
  emailNotice,
  emailParagraph,
  escapeHtml,
  renderEmailLayout,
} from "@/lib/email-layout"
import { SAFETY_LABELS } from "@/lib/seo/brand"
import { PLACE_TYPE_LABELS } from "@/lib/seo/place-metadata"

function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean)
  if (adminEmails?.length) return adminEmails
  const contactEmail = process.env.CONTACT_EMAIL?.trim()
  if (contactEmail) return [contactEmail]
  return []
}

function formatPlaceDraft(draft: Record<string, unknown>): string {
  const contact =
    draft.contact && typeof draft.contact === "object"
      ? (draft.contact as Record<string, unknown>)
      : {}
  const delivery =
    draft.delivery && typeof draft.delivery === "object"
      ? (draft.delivery as Record<string, unknown>)
      : {}
  const type = typeof draft.type === "string" ? draft.type : ""
  const safety = typeof draft.safetyLevel === "string" ? draft.safetyLevel : ""
  return emailDetails([
    ["Tipo", PLACE_TYPE_LABELS[type] ?? type],
    ["Dirección", draft.address],
    ["Localidad", draft.neighborhood],
    ["Horario", draft.openingHours],
    ["Instagram", contact.instagram],
    ["Web", contact.url],
    ["WhatsApp", contact.whatsapp],
    ["Delivery", delivery.available ? "Sí" : ""],
    ["Seguridad", SAFETY_LABELS[safety as keyof typeof SAFETY_LABELS] ?? safety],
    ["Tags", Array.isArray(draft.tags) ? draft.tags.join(", ") : ""],
  ])
}

export function buildSuggestionNewEmailHtml(params: {
  placeDraft: Record<string, unknown>
  suggestedByName: string
  suggestedByEmail: string
}): string {
  const { placeDraft, suggestedByName, suggestedByEmail } = params
  const adminUrl = `${getBaseUrl()}/admin`
  const placeName = (placeDraft.name as string) || "Sin nombre"

  return renderEmailLayout({
    title: `Sugerencia nueva: ${placeName}`,
    preheader: `${suggestedByName} sugirió un lugar para el mapa.`,
    eyebrow: "Lugar sugerido",
    heading: placeName,
    bodyHtml: [
      emailParagraph(
        `Sugerido por <strong style="color:#1F4D35;">${escapeHtml(suggestedByName)}</strong> · ${escapeHtml(suggestedByEmail)}`
      ),
      formatPlaceDraft(placeDraft),
    ].join(""),
    cta: { label: "Revisar en el admin", href: adminUrl },
  })
}

export function buildSuggestionApprovedEmailHtml(params: {
  placeName: string
  placeId: string
}): string {
  const { placeName, placeId } = params
  const placeUrl = `${getBaseUrl()}/lugar/${placeId}`

  return renderEmailLayout({
    title: `${placeName} ya está en el mapa`,
    preheader: "Tu sugerencia ya está publicada en CeliMap. ¡Gracias por sumar!",
    eyebrow: "¡Buenas noticias!",
    heading: "Tu sugerencia ya está en el mapa",
    bodyHtml: [
      emailParagraph(
        `<strong style="color:#1F4D35;">${escapeHtml(placeName)}</strong> ya está publicado en CeliMap. Gracias a vos, más personas celíacas van a poder encontrarlo, guardarlo y dejar su reseña.`
      ),
      emailNotice(
        "¿Ya fuiste?",
        "Dejale una reseña: contar cómo te atendieron y qué comiste ayuda un montón a la comunidad.",
        "olive"
      ),
    ].join(""),
    cta: { label: "Ver el lugar en el mapa", href: placeUrl },
    afterCtaHtml: emailFallbackLink(placeUrl),
  })
}

export function buildSuggestionRejectedEmailHtml(params: {
  placeName: string
  rejectionReason: string
}): string {
  const { placeName, rejectionReason } = params
  const suggestUrl = `${getBaseUrl()}/sugerir`

  return renderEmailLayout({
    title: `Revisamos ${placeName}`,
    preheader: "Revisamos tu sugerencia y te contamos por qué no la publicamos.",
    eyebrow: "Sugerencia revisada",
    heading: "Por ahora no la publicamos",
    bodyHtml: [
      emailParagraph(
        `Gracias por sugerir <strong style="color:#1F4D35;">${escapeHtml(placeName)}</strong>. La revisamos y por ahora no la vamos a sumar al mapa.`
      ),
      emailNotice("Motivo", rejectionReason),
      emailParagraph("Si podés completar lo que falta, volvé a sugerirlo: lo revisamos de nuevo."),
    ].join(""),
    cta: { label: "Sugerir de nuevo", href: suggestUrl, tone: "terracotta" },
  })
}

export async function sendSuggestionNewEmail(params: {
  placeDraft: Record<string, unknown>
  suggestedByName: string
  suggestedByEmail: string
}): Promise<boolean> {
  const admins = getAdminEmails()
  if (!admins.length) return false
  return sendCelimapEmail({
    tag: "email-suggestions",
    fromName: "CeliMap Sugerencias",
    to: admins,
    subject: `[CeliMap] Sugerencia nueva: ${(params.placeDraft.name as string) || "Sin nombre"}`,
    html: buildSuggestionNewEmailHtml(params),
  })
}

export async function sendSuggestionApprovedEmail(params: {
  userEmail: string
  placeName: string
  placeId: string
}): Promise<boolean> {
  if (!params.userEmail) return false
  return sendCelimapEmail({
    tag: "email-suggestions",
    fromName: "CeliMap",
    to: params.userEmail,
    subject: `¡${params.placeName} ya está en el mapa! 🎉`,
    html: buildSuggestionApprovedEmailHtml(params),
  })
}

export async function sendSuggestionRejectedEmail(params: {
  userEmail: string
  placeName: string
  rejectionReason: string
}): Promise<boolean> {
  if (!params.userEmail) return false
  return sendCelimapEmail({
    tag: "email-suggestions",
    fromName: "CeliMap",
    to: params.userEmail,
    subject: `Revisamos tu sugerencia: ${params.placeName}`,
    html: buildSuggestionRejectedEmailHtml(params),
  })
}
