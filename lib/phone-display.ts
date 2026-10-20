/**
 * Teléfono para mostrar en la ficha. Los datos vienen como se cargaron: muchos son
 * solo dígitos ("0111530105978"), que no se leen. Si el número ya trae espacios o
 * guiones se respeta; si no, se agrupan los casos argentinos comunes. Ante la duda,
 * queda como vino.
 */
export function formatPhoneForDisplay(raw: string | null | undefined): string {
  const value = (raw ?? "").trim()
  if (!value) return ""
  if (/[\s\-().]/.test(value)) return value

  const plus = value.startsWith("+")
  const digits = value.replace(/\D/g, "")
  if (!digits) return value

  const last8 = (d: string) => `${d.slice(0, 4)}-${d.slice(4)}`

  // +54 9 11 XXXX-XXXX (celular de CABA/AMBA en formato internacional)
  let m = digits.match(/^549(11)(\d{8})$/)
  if (m) return `+54 9 ${m[1]} ${last8(m[2])}`
  // +54 11 XXXX-XXXX (fijo de CABA/AMBA en formato internacional)
  m = digits.match(/^54(11)(\d{8})$/)
  if (m) return `+54 ${m[1]} ${last8(m[2])}`
  if (plus) return value

  // 011 15 XXXX-XXXX / 11 15 XXXX-XXXX (celular de CABA/AMBA)
  m = digits.match(/^0?11(15)(\d{8})$/)
  if (m) return `011 15 ${last8(m[2])}`
  // 011 XXXX-XXXX / 11 XXXX-XXXX (fijo, o celular sin el 15)
  m = digits.match(/^0?11(\d{8})$/)
  if (m) return `011 ${last8(m[1])}`
  // Solo el número local de 8 dígitos
  if (/^\d{8}$/.test(digits)) return last8(digits)

  return value
}
