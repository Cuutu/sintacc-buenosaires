import { Resend } from "resend"

/**
 * Remitente desde RESEND_FROM_DOMAIN. Acepta dirección completa ("hola@celimap.com.ar")
 * o dominio suelto ("celimap.com.ar" → hola@celimap.com.ar). El dominio tiene que estar
 * verificado en Resend: con onboarding@resend.dev Resend solo entrega al dueño de la
 * cuenta y responde 403 al resto.
 */
export function getEmailFromAddress(): string {
  const raw = process.env.RESEND_FROM_DOMAIN?.trim() || "onboarding@resend.dev"
  return raw.includes("@") ? raw : `hola@${raw.replace(/^@/, "")}`
}

/**
 * Envía con Resend. El SDK (v6) no tira excepción si la API rechaza el mail:
 * devuelve `{ error }`. Sin revisarlo, un 403 pasa como éxito.
 */
export async function sendCelimapEmail(options: {
  /** Nombre visible: "CeliMap", "CeliMap Emprendimientos"... */
  fromName: string
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
  /** Prefijo para logs. */
  tag: string
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn(`[${options.tag}] RESEND_API_KEY no configurada: no se envía el mail`)
    return false
  }
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: `${options.fromName} <${getEmailFromAddress()}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    })
    if (error) {
      console.error(`[${options.tag}] Resend rechazó el mail:`, error.name, error.message)
      return false
    }
    return true
  } catch (err) {
    console.error(`[${options.tag}] Error enviando mail:`, err)
    return false
  }
}
