export const ADMIN_ESTADOS = ["pendiente", "respondido", "archivado"] as const
export type AdminEstado = (typeof ADMIN_ESTADOS)[number]

export function isAdminEstado(value: unknown): value is AdminEstado {
  return typeof value === "string" && ADMIN_ESTADOS.includes(value as AdminEstado)
}

// Durante el despliegue, los documentos sin migrar también son pendientes.
export function estadoQuery(estado: AdminEstado): Record<string, unknown> {
  return estado === "pendiente"
    ? { $or: [{ estado: "pendiente" }, { estado: { $exists: false } }] }
    : { estado }
}

export function contactReplyUrl(email: string, subject: string, message: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${subject}`)}&body=${encodeURIComponent(`\n\n--- Mensaje original ---\n${message.split(/\r?\n/).map((line) => `> ${line}`).join("\n")}`)}`
}
