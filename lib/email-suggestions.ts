/**
 * Emails para sugerencias: admin (nueva) y usuario (aprobada).
 * Usa Resend. Requiere RESEND_API_KEY y RESEND_FROM_DOMAIN.
 */

import { Resend } from "resend"

function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean)
  if (adminEmails?.length) return adminEmails
  const contactEmail = process.env.CONTACT_EMAIL?.trim()
  if (contactEmail) return [contactEmail]
  return []
}

function getAppBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL?.trim()
  if (url) return url.replace(/\/$/, "")
  return "https://sintacc-map.vercel.app"
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function formatPlaceDraft(draft: Record<string, unknown>): string {
  const rows: string[] = []
  const add = (label: string, value: unknown) => {
    if (value != null && value !== "") {
      rows.push(`<tr><td style="padding:6px 0;font-size:12px;color:#71717a;width:120px;">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#fafafa;">${escapeHtml(String(value))}</td></tr>`)
    }
  }
  add("Nombre", draft.name)
  add("Tipo", draft.type)
  add("Dirección", draft.address)
  add("Localidad", draft.neighborhood)
  add("Horario", draft.openingHours)
  if (draft.contact && typeof draft.contact === "object") {
    const c = draft.contact as Record<string, unknown>
    add("Instagram", c.instagram)
    add("Web", c.url)
    add("WhatsApp", c.whatsapp)
  }
  if (draft.delivery && typeof draft.delivery === "object") {
    const d = draft.delivery as Record<string, unknown>
    if (d.available) add("Delivery", "Sí")
  }
  if (draft.safetyLevel) add("Nivel seguridad", draft.safetyLevel)
  if (Array.isArray(draft.tags) && draft.tags.length) add("Tags", draft.tags.join(", "))
  return rows.length ? `<table>${rows.join("")}</table>` : "<p>Sin datos adicionales</p>"
}

export function buildSuggestionNewEmailHtml(params: {
  placeDraft: Record<string, unknown>
  suggestedByName: string
  suggestedByEmail: string
}): string {
  const { placeDraft, suggestedByName, suggestedByEmail } = params
  const baseUrl = getAppBaseUrl()
  const logoUrl = `${baseUrl}/celimaplogocompleto.png`
  const iconUrl = `${baseUrl}/CelimapLOGO.png`
  const adminUrl = `${baseUrl}/admin`
  const placeName = (placeDraft.name as string) || "Sin nombre"

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Sugerencia nueva - Celimap</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0f0f12;color:#e4e4e7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f0f12;min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="${logoUrl}" alt="Celimap" width="160" height="42" style="height:42px;width:auto;display:block;margin:0 auto;" />
          <p style="margin:12px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#10b981;font-weight:600;">Sugerencia nueva</p>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#fafafa;">${escapeHtml(placeName)}</h1>
              <p style="margin:8px 0 0;font-size:13px;color:#71717a;">Sugerido por ${escapeHtml(suggestedByName)} (${escapeHtml(suggestedByEmail)})</p>
            </td></tr>
            <tr><td style="padding:24px 28px;">
              <p style="margin:0 0 12px;font-size:12px;color:#71717a;">Detalles del lugar</p>
              <div style="padding:16px;background:rgba(0,0,0,0.2);border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                ${formatPlaceDraft(placeDraft)}
              </div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center;">
          <a href="${adminUrl}" style="display:inline-block;padding:14px 28px;background:#10b981;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">Ver en el panel admin</a>
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
          <img src="${iconUrl}" alt="Celimap" width="32" height="32" style="height:32px;width:32px;display:block;margin:0 auto 12px;opacity:0.8;" />
          <p style="margin:0;font-size:12px;color:#52525b;">Celimap · Lugares sin gluten en todo el mundo</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}

export function buildSuggestionApprovedEmailHtml(params: {
  placeName: string
  placeId: string
}): string {
  const { placeName, placeId } = params
  const baseUrl = getAppBaseUrl()
  const logoUrl = `${baseUrl}/celimaplogocompleto.png`
  const iconUrl = `${baseUrl}/CelimapLOGO.png`
  const placeUrl = `${baseUrl}/lugar/${placeId}`

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Tu sugerencia fue aprobada - Celimap</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#0f0f12;color:#e4e4e7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f0f12;min-height:100vh;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="${logoUrl}" alt="Celimap" width="160" height="42" style="height:42px;width:auto;display:block;margin:0 auto;" />
          <p style="margin:12px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#10b981;font-weight:600;">¡Buenas noticias!</p>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="padding:28px;">
              <h1 style="margin:0;font-size:22px;font-weight:600;color:#fafafa;">Tu sugerencia fue aprobada</h1>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#d4d4d8;">
                <strong>${escapeHtml(placeName)}</strong> ya está publicado en el mapa de Celimap. La comunidad celíaca puede verlo y agregar reseñas.
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center;">
          <a href="${placeUrl}" style="display:inline-block;padding:14px 28px;background:#10b981;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">Ver el lugar en el mapa</a>
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
          <img src="${iconUrl}" alt="Celimap" width="32" height="32" style="height:32px;width:32px;display:block;margin:0 auto 12px;opacity:0.8;" />
          <p style="margin:0;font-size:12px;color:#52525b;">Celimap · Lugares sin gluten en todo el mundo</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}

export async function sendSuggestionNewEmail(params: {
  placeDraft: Record<string, unknown>
  suggestedByName: string
  suggestedByEmail: string
}): Promise<boolean> {
  const admins = getAdminEmails()
  const resendKey = process.env.RESEND_API_KEY
  if (!admins.length || !resendKey) return false

  const resend = new Resend(resendKey)
  const fromDomain = process.env.RESEND_FROM_DOMAIN ?? "onboarding@resend.dev"

  try {
    await resend.emails.send({
      from: `Celimap Sugerencias <${fromDomain}>`,
      to: admins,
      subject: `[Celimap] Sugerencia nueva: ${(params.placeDraft.name as string) || "Sin nombre"}`,
      html: buildSuggestionNewEmailHtml({
        placeDraft: params.placeDraft,
        suggestedByName: params.suggestedByName,
        suggestedByEmail: params.suggestedByEmail,
      }),
    })
    return true
  } catch (err) {
    console.error("[email-suggestions] Error enviando email nueva sugerencia:", err)
    return false
  }
}

export async function sendSuggestionApprovedEmail(params: {
  userEmail: string
  placeName: string
  placeId: string
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!params.userEmail || !resendKey) return false

  const resend = new Resend(resendKey)
  const fromDomain = process.env.RESEND_FROM_DOMAIN ?? "onboarding@resend.dev"

  try {
    await resend.emails.send({
      from: `Celimap <${fromDomain}>`,
      to: params.userEmail,
      subject: `[Celimap] Tu sugerencia "${params.placeName}" fue aprobada`,
      html: buildSuggestionApprovedEmailHtml({
        placeName: params.placeName,
        placeId: params.placeId,
      }),
    })
    return true
  } catch (err) {
    console.error("[email-suggestions] Error enviando email sugerencia aprobada:", err)
    return false
  }
}
