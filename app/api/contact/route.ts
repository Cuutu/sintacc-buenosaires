import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Contact } from "@/models/Contact"
import { requireAuth } from "@/lib/middleware"
import { checkRateLimit, checkRateLimitByIp } from "@/lib/rate-limit"
import { logApiError } from "@/lib/logger"
import mongoose from "mongoose"
import { z } from "zod"
import { sendCelimapEmail } from "@/lib/email-send"
import { invalidateApiCache } from "@/lib/api-cache"
import { emailDetails, emailNotice, renderEmailLayout } from "@/lib/email-layout"

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

/** Valores crudos: el layout escapa todo. */
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
  const replyHref = `mailto:${email}?subject=${encodeURIComponent(`Re: ${subject}`)}`
  return renderEmailLayout({
    title: `Consulta: ${subject}`,
    preheader: `${name} escribió desde el formulario de contacto.`,
    eyebrow: "Consulta de contacto",
    heading: subject,
    bodyHtml: [
      emailDetails([
        ["De", name],
        ["Email", email],
      ]),
      emailNotice("Mensaje", message, "olive"),
    ].join(""),
    cta: { label: "Responder", href: replyHref },
  })
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
    invalidateApiCache(["admin:counts"])

    // Enviar email al admin si está configurado Resend
    const adminEmail = getContactEmail()
    if (adminEmail) {
      await sendCelimapEmail({
        tag: "contact",
        fromName: "CeliMap Contacto",
        to: adminEmail,
        replyTo: email || undefined,
        subject: `[CeliMap] ${validated.subject}`,
        html: buildContactEmailHtml({
          subject: validated.subject,
          name: name || "Usuario",
          email,
          message: validated.message,
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
