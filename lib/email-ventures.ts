import { Resend } from "resend"
import { getBaseUrl } from "@/lib/base-url"
import { getCategoryLabel, getSafetyBadge } from "@/lib/venture-constants"

function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean)
  if (adminEmails?.length) return adminEmails
  const contactEmail = process.env.CONTACT_EMAIL?.trim()
  if (contactEmail) return [contactEmail]
  return []
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function formatVentureDraft(
  draft: Record<string, unknown>,
  extra?: { suggesterComment?: string; shipsNationwide?: boolean }
): string {
  const rows: string[] = []
  const add = (label: string, value: unknown) => {
    if (value != null && value !== "") {
      rows.push(
        `<tr><td style="padding:6px 0;font-size:12px;color:#71717a;width:140px;">${escapeHtml(label)}</td><td style="padding:6px 0;font-size:14px;color:#fafafa;">${escapeHtml(String(value))}</td></tr>`
      )
    }
  }
  add("Nombre", draft.name)
  add("Categoría", draft.category ? getCategoryLabel(String(draft.category)) : undefined)
  add("Zona", draft.zone)
  if (Array.isArray(draft.modalities) && draft.modalities.length) {
    add("Modalidades", draft.modalities.join(", "))
  }
  const safety = getSafetyBadge(draft.safetyLevel as string | undefined)
  add("Seguridad", safety.label)
  if (draft.contact && typeof draft.contact === "object") {
    const c = draft.contact as Record<string, unknown>
    add("Instagram", c.instagram)
    add("WhatsApp", c.whatsapp)
  }
  if (draft.certifiedProducts) add("Certificados", "Sí")
  add("Dónde comprar", draft.purchaseChannels)
  if (extra?.shipsNationwide) add("Envíos", "Sí")
  if (extra?.suggesterComment) add("Comentario", extra.suggesterComment)
  return rows.length ? `<table>${rows.join("")}</table>` : "<p>Sin datos adicionales</p>"
}

export function buildVentureSuggestionNewEmailHtml(params: {
  ventureDraft: Record<string, unknown>
  suggestedByName: string
  suggestedByEmail: string
  suggesterComment?: string
  shipsNationwide?: boolean
}): string {
  const { ventureDraft, suggestedByName, suggestedByEmail, suggesterComment, shipsNationwide } =
    params
  const baseUrl = getBaseUrl()
  const logoUrl = `${baseUrl}/celimaplogocompleto.png`
  const adminUrl = `${baseUrl}/admin`
  const name = (ventureDraft.name as string) || "Sin nombre"

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#0f0f12;color:#e4e4e7;">
  <table width="100%" style="background:#0f0f12;"><tr><td align="center" style="padding:40px 20px;">
    <table style="max-width:560px;">
      <tr><td style="text-align:center;padding-bottom:24px;">
        <img src="${logoUrl}" alt="Celimap" width="160" height="42" />
        <p style="font-size:11px;color:#10b981;font-weight:600;">EMPRENDIMIENTO NUEVO</p>
      </td></tr>
      <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;">
        <h1 style="margin:0;font-size:20px;color:#fafafa;">${escapeHtml(name)}</h1>
        <p style="font-size:13px;color:#71717a;">Por ${escapeHtml(suggestedByName)} (${escapeHtml(suggestedByEmail)})</p>
        <div style="margin-top:16px;padding:16px;background:rgba(0,0,0,0.2);border-radius:12px;">
          ${formatVentureDraft(ventureDraft, { suggesterComment, shipsNationwide })}
        </div>
      </td></tr>
      <tr><td style="padding:24px;text-align:center;">
        <a href="${adminUrl}" style="display:inline-block;padding:14px 28px;background:#10b981;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Ver en admin</a>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`.trim()
}

export function buildVentureApprovedEmailHtml(params: {
  ventureName: string
  ventureSlug: string
}): string {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/emprendimientos/${params.ventureSlug}`
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:sans-serif;background:#0f0f12;color:#e4e4e7;">
  <table width="100%" style="background:#0f0f12;"><tr><td align="center" style="padding:40px 20px;">
    <table style="max-width:560px;">
      <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
        <h1 style="margin:0;font-size:22px;color:#fafafa;">Tu emprendimiento fue publicado</h1>
        <p style="margin:16px 0 0;color:#d4d4d8;"><strong>${escapeHtml(params.ventureName)}</strong> ya está en Celimap Emprendimientos.</p>
      </td></tr>
      <tr><td style="padding:24px;text-align:center;">
        <a href="${url}" style="display:inline-block;padding:14px 28px;background:#10b981;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">Ver emprendimiento</a>
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`.trim()
}

export async function sendVentureSuggestionNewEmail(params: {
  ventureDraft: Record<string, unknown>
  suggestedByName: string
  suggestedByEmail: string
  suggesterComment?: string
  shipsNationwide?: boolean
}): Promise<boolean> {
  const admins = getAdminEmails()
  const resendKey = process.env.RESEND_API_KEY
  if (!admins.length || !resendKey) return false

  const resend = new Resend(resendKey)
  const fromDomain = process.env.RESEND_FROM_DOMAIN ?? "onboarding@resend.dev"

  try {
    await resend.emails.send({
      from: `Celimap Emprendimientos <${fromDomain}>`,
      to: admins,
      subject: `[Celimap] Emprendimiento nuevo: ${(params.ventureDraft.name as string) || "Sin nombre"}`,
      html: buildVentureSuggestionNewEmailHtml(params),
    })
    return true
  } catch (err) {
    console.error("[email-ventures] Error enviando email:", err)
    return false
  }
}

export async function sendVentureApprovedEmail(params: {
  userEmail: string
  ventureName: string
  ventureSlug: string
}): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY
  if (!params.userEmail || !resendKey) return false

  const resend = new Resend(resendKey)
  const fromDomain = process.env.RESEND_FROM_DOMAIN ?? "onboarding@resend.dev"

  try {
    await resend.emails.send({
      from: `Celimap <${fromDomain}>`,
      to: params.userEmail,
      subject: `[Celimap] "${params.ventureName}" ya está publicado`,
      html: buildVentureApprovedEmailHtml(params),
    })
    return true
  } catch (err) {
    console.error("[email-ventures] Error email aprobado:", err)
    return false
  }
}
