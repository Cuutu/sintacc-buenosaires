/**
 * Zona de un emprendimiento para mostrar. Se carga a mano y a veces llega como
 * "Caba" o "caba": la sigla va siempre en mayúsculas. El resto queda como vino.
 */
export function formatVentureZone(zone: string | null | undefined): string {
  const value = (zone ?? "").trim()
  if (!value) return ""
  return value.replace(/\bc\.?a\.?b\.?a\.?(?=$|[\s,·/)-])/gi, "CABA")
}
