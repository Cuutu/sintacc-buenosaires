/**
 * Layout de mails CeliMap (estética actual: crema + oliva + terracota, Fraunces/Nunito).
 * HTML de mail: tablas + estilos inline. Nada de flex/grid ni CSS externo: Gmail lo borra.
 * Las fuentes cargan en Apple Mail / iOS; Gmail cae al stack de fallback.
 */
import { getBaseUrl } from "@/lib/base-url"

export const EMAIL_COLORS = {
  page: "#F3EEE4",
  card: "#FDFBF7",
  border: "#E8E1D6",
  olive: "#1F4D35",
  terracotta: "#C85A2E",
  cream: "#F8F5EF",
  muted: "#5F6B63",
  soft: "#8A938C",
} as const

const SANS = "'Nunito','Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif"
const SERIF = "'Fraunces',Georgia,'Times New Roman',serif"

export type EmailTone = "olive" | "terracotta"

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function toneColor(tone: EmailTone): string {
  return tone === "terracotta" ? EMAIL_COLORS.terracotta : EMAIL_COLORS.olive
}

/** Botón "bulletproof": tabla + link, se ve igual en Outlook/Gmail. */
export function emailButton(label: string, href: string, tone: EmailTone = "olive"): string {
  const bg = toneColor(tone)
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
  <tr><td style="border-radius:999px;background:${bg};">
    <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:${SANS};font-size:15px;font-weight:700;color:${EMAIL_COLORS.cream};text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
  </td></tr>
</table>`
}

export function emailParagraph(html: string): string {
  return `<p style="margin:0 0 14px;font-family:${SANS};font-size:16px;line-height:1.6;color:${EMAIL_COLORS.muted};">${html}</p>`
}

/** Caja destacada (motivo de rechazo, comentario, tip). `text` se escapa. */
export function emailNotice(label: string, text: string, tone: EmailTone = "terracotta"): string {
  const color = toneColor(tone)
  const bg = tone === "terracotta" ? "#FBEFE8" : "#EAF0EC"
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:6px 0 18px;">
  <tr><td style="padding:16px 18px;background:${bg};border-left:4px solid ${color};border-radius:12px;">
    <p style="margin:0 0 6px;font-family:${SANS};font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:${color};">${escapeHtml(label)}</p>
    <p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.6;color:${EMAIL_COLORS.olive};white-space:pre-line;">${escapeHtml(text)}</p>
  </td></tr>
</table>`
}

/** Tabla label/valor para mails de admin. Filas vacías se omiten; todo se escapa. */
export function emailDetails(rows: Array<[label: string, value: unknown]>): string {
  const cells = rows
    .filter(([, value]) => value != null && value !== "")
    .map(
      ([label, value]) => `
  <tr>
    <td valign="top" style="padding:9px 12px 9px 0;width:130px;font-family:${SANS};font-size:13px;font-weight:700;color:${EMAIL_COLORS.soft};border-bottom:1px solid ${EMAIL_COLORS.border};">${escapeHtml(label)}</td>
    <td valign="top" style="padding:9px 0;font-family:${SANS};font-size:15px;line-height:1.5;color:${EMAIL_COLORS.olive};border-bottom:1px solid ${EMAIL_COLORS.border};white-space:pre-line;">${escapeHtml(String(value))}</td>
  </tr>`
    )
    .join("")
  if (!cells) return emailParagraph("Sin datos adicionales.")
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 18px;">${cells}</table>`
}

export function renderEmailLayout(options: {
  /** <title> y texto oculto que se ve en la bandeja junto al asunto. */
  title: string
  preheader: string
  eyebrow: string
  eyebrowTone?: EmailTone
  heading: string
  /** HTML ya armado con los helpers (escapado). */
  bodyHtml: string
  cta?: { label: string; href: string; tone?: EmailTone }
  /** Línea chica bajo el botón (ej. link de respaldo). */
  afterCtaHtml?: string
}): string {
  const baseUrl = getBaseUrl()
  const logoUrl = `${baseUrl}/email/celimap-logo.png`
  const markUrl = `${baseUrl}/email/celimap-mark.png`
  const eyebrowColor = toneColor(options.eyebrowTone ?? "terracotta")
  let siteLabel = "CeliMap"
  try {
    siteLabel = new URL(baseUrl).host.replace(/^www\./, "")
  } catch {
    /* baseUrl sin protocolo */
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(options.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${EMAIL_COLORS.page};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${EMAIL_COLORS.page};">${escapeHtml(options.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${EMAIL_COLORS.page};">
    <tr><td align="center" style="padding:36px 16px 28px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
        <tr><td align="center" style="padding:0 0 26px;">
          <a href="${baseUrl}" target="_blank" style="text-decoration:none;">
            <img src="${logoUrl}" alt="CeliMap · tu mapa sin gluten" width="220" height="67" style="display:block;width:220px;height:auto;border:0;">
          </a>
        </td></tr>
        <tr><td style="background:${EMAIL_COLORS.card};border:1px solid ${EMAIL_COLORS.border};border-radius:24px;overflow:hidden;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td style="height:6px;line-height:6px;font-size:0;background:${EMAIL_COLORS.olive};border-radius:24px 24px 0 0;">&nbsp;</td></tr>
            <tr><td style="padding:32px 32px 30px;">
              <p style="margin:0 0 10px;font-family:${SANS};font-size:12px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:${eyebrowColor};">${escapeHtml(options.eyebrow)}</p>
              <h1 style="margin:0 0 18px;font-family:${SERIF};font-size:28px;line-height:1.2;font-weight:700;color:${EMAIL_COLORS.olive};">${escapeHtml(options.heading)}</h1>
              ${options.bodyHtml}
              ${
                options.cta
                  ? `<div style="padding:10px 0 2px;">${emailButton(options.cta.label, options.cta.href, options.cta.tone)}</div>`
                  : ""
              }
              ${options.afterCtaHtml ?? ""}
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:26px 12px 0;">
          <img src="${markUrl}" alt="" width="24" height="32" style="display:block;width:24px;height:auto;border:0;margin:0 auto 10px;">
          <p style="margin:0 0 4px;font-family:${SERIF};font-size:15px;font-style:italic;color:${EMAIL_COLORS.terracotta};">tu mapa sin gluten</p>
          <p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.6;color:${EMAIL_COLORS.soft};">
            Lugares y emprendimientos sin TACC en Argentina ·
            <a href="${baseUrl}" target="_blank" style="color:${EMAIL_COLORS.olive};font-weight:700;text-decoration:none;">${escapeHtml(siteLabel)}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/** Link de respaldo bajo el botón, por si el cliente de mail no lo renderiza. */
export function emailFallbackLink(href: string): string {
  return `<p style="margin:18px 0 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${EMAIL_COLORS.soft};text-align:center;">¿No funciona el botón? <a href="${escapeHtml(href)}" target="_blank" style="color:${EMAIL_COLORS.olive};word-break:break-all;">${escapeHtml(href)}</a></p>`
}
