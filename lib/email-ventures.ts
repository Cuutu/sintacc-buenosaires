import { sendCelimapEmail } from "@/lib/email-send"
import { getBaseUrl } from "@/lib/base-url"
import {
  getCategoryLabels,
  getModalityLabels,
  getSafetyBadge,
  getVentureCategories,
} from "@/lib/venture-constants"
import {
  emailDetails,
  emailFallbackLink,
  emailNotice,
  emailParagraph,
  escapeHtml,
  renderEmailLayout,
} from "@/lib/email-layout"

function getAdminEmails(): string[] {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()).filter(Boolean)
  if (adminEmails?.length) return adminEmails
  const contactEmail = process.env.CONTACT_EMAIL?.trim()
  if (contactEmail) return [contactEmail]
  return []
}

function formatVentureDraft(
  draft: Record<string, unknown>,
  extra?: { shipsNationwide?: boolean }
): string {
  const categories = getVentureCategories({
    category: typeof draft.category === "string" ? draft.category : undefined,
    categories: Array.isArray(draft.categories) ? (draft.categories as string[]) : undefined,
  })
  const contact =
    draft.contact && typeof draft.contact === "object"
      ? (draft.contact as Record<string, unknown>)
      : {}
  return emailDetails([
    [categories.length > 1 ? "Categorías" : "Categoría", getCategoryLabels(categories).join(", ")],
    ["Zona", draft.zone],
    [
      "Modalidades",
      Array.isArray(draft.modalities) ? getModalityLabels(draft.modalities as string[]).join(", ") : "",
    ],
    ["Seguridad", getSafetyBadge(draft.safetyLevel as string | undefined).label],
    ["Instagram", contact.instagram],
    ["WhatsApp", contact.whatsapp],
    ["Certificados", draft.certifiedProducts ? "Sí" : ""],
    ["Dónde comprar", draft.purchaseChannels],
    ["Envíos a todo el país", extra?.shipsNationwide ? "Sí" : ""],
  ])
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
  const adminUrl = `${getBaseUrl()}/admin`
  const name = (ventureDraft.name as string) || "Sin nombre"

  return renderEmailLayout({
    title: `Emprendimiento nuevo: ${name}`,
    preheader: `${suggestedByName} sugirió un emprendimiento para revisar.`,
    eyebrow: "Emprendimiento nuevo",
    heading: name,
    bodyHtml: [
      emailParagraph(
        `Sugerido por <strong style="color:#1F4D35;">${escapeHtml(suggestedByName)}</strong> · ${escapeHtml(suggestedByEmail)}`
      ),
      formatVentureDraft(ventureDraft, { shipsNationwide }),
      suggesterComment ? emailNotice("Comentario", suggesterComment, "olive") : "",
    ].join(""),
    cta: { label: "Revisar en el admin", href: adminUrl },
  })
}

export function buildVentureApprovedEmailHtml(params: {
  ventureName: string
  ventureSlug: string
}): string {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/emprendimientos/${params.ventureSlug}`
  const name = escapeHtml(params.ventureName)

  return renderEmailLayout({
    title: `${params.ventureName} ya está en CeliMap`,
    preheader: `Tu emprendimiento ya se puede ver en CeliMap. ¡Gracias por sumar!`,
    eyebrow: "¡Ya está online!",
    eyebrowTone: "terracotta",
    heading: "Tu emprendimiento fue publicado",
    bodyHtml: [
      emailParagraph(
        `<strong style="color:#1F4D35;">${name}</strong> ya forma parte de los emprendimientos 100% sin gluten de CeliMap. Desde ahora la comunidad celíaca lo puede encontrar, contactar por WhatsApp o Instagram y dejarle reseñas.`
      ),
      emailNotice(
        "Tip",
        "Compartí el link en tus redes: cuantas más reseñas tenga, más arriba aparece para quienes buscan.",
        "olive"
      ),
    ].join(""),
    cta: { label: "Ver emprendimiento", href: url },
    afterCtaHtml: emailFallbackLink(url),
  })
}

export function buildVentureRejectedEmailHtml(params: {
  ventureName: string
  rejectionReason: string
}): string {
  const suggestUrl = `${getBaseUrl()}/sugerir-emprendimiento`

  return renderEmailLayout({
    title: `Revisamos ${params.ventureName}`,
    preheader: "Revisamos tu sugerencia y te contamos por qué no la publicamos.",
    eyebrow: "Sugerencia revisada",
    heading: "Por ahora no lo publicamos",
    bodyHtml: [
      emailParagraph(
        `Gracias por sugerir <strong style="color:#1F4D35;">${escapeHtml(params.ventureName)}</strong>. Lo revisamos y por ahora no lo vamos a sumar a CeliMap.`
      ),
      emailNotice("Motivo", params.rejectionReason),
      emailParagraph("Si podés corregir lo que falta, volvé a sugerirlo: lo revisamos de nuevo."),
    ].join(""),
    cta: { label: "Sugerir de nuevo", href: suggestUrl, tone: "terracotta" },
  })
}

export async function sendVentureSuggestionNewEmail(params: {
  ventureDraft: Record<string, unknown>
  suggestedByName: string
  suggestedByEmail: string
  suggesterComment?: string
  shipsNationwide?: boolean
}): Promise<boolean> {
  const admins = getAdminEmails()
  if (!admins.length) return false
  return sendCelimapEmail({
    tag: "email-ventures",
    fromName: "CeliMap Emprendimientos",
    to: admins,
    subject: `[CeliMap] Emprendimiento nuevo: ${(params.ventureDraft.name as string) || "Sin nombre"}`,
    html: buildVentureSuggestionNewEmailHtml(params),
  })
}

export async function sendVentureApprovedEmail(params: {
  userEmail: string
  ventureName: string
  ventureSlug: string
}): Promise<boolean> {
  if (!params.userEmail) return false
  return sendCelimapEmail({
    tag: "email-ventures",
    fromName: "CeliMap",
    to: params.userEmail,
    subject: `¡${params.ventureName} ya está en CeliMap! 🎉`,
    html: buildVentureApprovedEmailHtml(params),
  })
}

export async function sendVentureRejectedEmail(params: {
  userEmail: string
  ventureName: string
  rejectionReason: string
}): Promise<boolean> {
  if (!params.userEmail) return false
  return sendCelimapEmail({
    tag: "email-ventures",
    fromName: "CeliMap",
    to: params.userEmail,
    subject: `Revisamos tu sugerencia: ${params.ventureName}`,
    html: buildVentureRejectedEmailHtml(params),
  })
}
