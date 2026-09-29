/** Número AR a formato internacional para wa.me (549 + área + número). */
export function normalizeArWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  if (digits.startsWith("549")) return digits
  if (digits.startsWith("54")) return `549${digits.slice(2)}`
  if (digits.startsWith("9") && digits.length >= 10) return `54${digits}`
  if (digits.startsWith("15") && digits.length >= 8) return `54911${digits.slice(2)}`
  return `54${digits}`
}
