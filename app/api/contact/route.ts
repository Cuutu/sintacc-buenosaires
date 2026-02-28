import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Contact } from "@/models/Contact"
import { requireAuth } from "@/lib/middleware"
import { checkRateLimit, checkRateLimitByIp } from "@/lib/rate-limit"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"
import { z } from "zod"
import { Resend } from "resend"

const contactSchema = z.object({
  subject: z.string().min(1, "El asunto es requerido").max(200),
  message: z.string().min(1, "El mensaje es requerido").max(2000),
})

function getContactEmail(): string | null {
  const contactEmail = process.env.CONTACT_EMAIL?.trim()
  if (contactEmail) return contactEmail
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean)
  return adminEmails?.[0] ?? null
}

function getAppBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL?.trim()
  if (url) return url.replace(/\/$/, "")
  return "https://sintacc-map.vercel.app"
}

function buildContactEmailHtml({
  subject,
  name,
  email,
  message,
}: {
  subject: string
  name: string
  email: string
  message: string
}): string {
  const baseUrl = getAppBaseUrl()
  const logoUrl = `${baseUrl}/celimaplogocompleto.png`
  const iconUrl = `${baseUrl}/CelimapLOGO.png`
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva consulta - Celimap</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#0f0f12;color:#e4e4e7;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(180deg,#0f0f12 0%,#0b0b0e 100%);min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
          <!-- Header con logo -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <img src="${logoUrl}" alt="Celimap" width="160" height="42" style="height:42px;width:auto;display:block;margin:0 auto;" />
              <p style="margin:12px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#10b981;font-weight:600;">Nueva consulta de contacto</p>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.2);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <!-- Subject -->
                <tr>
                  <td style="padding:28px 28px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#10b981;font-weight:600;">Nueva consulta</p>
                    <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;color:#fafafa;line-height:1.3;">${subject}</h1>
                  </td>
                </tr>
                <!-- Sender -->
                <tr>
                  <td style="padding:20px 28px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:12px 16px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
                          <p style="margin:0 0 4px;font-size:12px;color:#71717a;">De</p>
                          <p style="margin:0;font-size:15px;font-weight:500;color:#fafafa;">${name}</p>
                          <p style="margin:4px 0 0;font-size:14px;color:#10b981;">${email}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <!-- Message -->
                <tr>
                  <td style="padding:24px 28px 28px;">
                    <p style="margin:0 0 12px;font-size:12px;color:#71717a;">Mensaje</p>
                    <div style="padding:20px;background:rgba(0,0,0,0.2);border-radius:12px;border:1px solid rgba(255,255,255,0.04);">
                      <p style="margin:0;font-size:15px;line-height:1.6;color:#d4d4d8;white-space:pre-wrap;">${message}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:28px 0;text-align:center;">
              <a href="mailto:${email}?subject=Re:%20${encodeURIComponent(subject)}" style="display:inline-block;padding:14px 28px;background:#10b981;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.3px;">Responder al usuario</a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <img src="${iconUrl}" alt="Celimap" width="32" height="32" style="height:32px;width:32px;display:block;margin:0 auto 12px;opacity:0.8;" />
              <p style="margin:0;font-size:12px;color:#52525b;">Celimap · Lugares sin gluten en todo el mundo</p>
              <p style="margin:6px 0 0;font-size:11px;color:#3f3f46;">Consultas de la comunidad celíaca</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session

    await connectDB()

    const [userLimit, ipLimit] = await Promise.all([
      checkRateLimit(session.user.id, "contact", 5),
      checkRateLimitByIp(request, "contact_ip", 20, 1440),
    ])
    if (!userLimit.allowed) {
      return NextResponse.json(
        {
          error: `Límite alcanzado. Podés enviar hasta 5 mensajes de contacto por día. Quedan ${userLimit.remaining} disponibles.`,
        },
        { status: 429 }
      )
    }
    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          error: `Demasiadas solicitudes desde esta dirección. Volvé a intentar mañana.`,
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const validated = contactSchema.parse(body)

    const name = session.user.name ?? ""
    const email = session.user.email ?? ""

    const contact = new Contact({
      userId: new mongoose.Types.ObjectId(session.user.id),
      name,
      email,
      subject: validated.subject,
      message: validated.message,
    })

    await contact.save()

    // Enviar email al admin si está configurado Resend
    const adminEmail = getContactEmail()
    const resendKey = process.env.RESEND_API_KEY
    if (adminEmail && resendKey) {
      const resend = new Resend(resendKey)
      const fromDomain = process.env.RESEND_FROM_DOMAIN ?? "onboarding@resend.dev"
      const escapedMessage = validated.message
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")
      const escapedSubject = validated.subject
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      const escapedName = (name || "Usuario")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
      const escapedEmail = email.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

      await resend.emails.send({
        from: `Celimap Contacto <${fromDomain}>`,
        to: adminEmail,
        replyTo: email,
        subject: `[Celimap] ${validated.subject}`,
        html: buildContactEmailHtml({
          subject: escapedSubject,
          name: escapedName,
          email: escapedEmail,
          message: escapedMessage,
        }),
      })
    }

    return NextResponse.json(
      { message: "Mensaje enviado correctamente" },
      { status: 201 }
    )
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      )
    }
    logApiError("/api/contact", error, { request })
    return NextResponse.json(
      { error: "Error al enviar mensaje" },
      { status: 500 }
    )
  }
}
