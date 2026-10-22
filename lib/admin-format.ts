/**
 * Formatos que usa el admin. Funciones puras: sirven en cliente y en tests.
 */

/** Decimales de las coordenadas: 6 dan ~10 cm, más es ruido de float (-58.55315150000001). */
export const COORDINATE_DECIMALS = 6

/** Coordenada para mostrar o para un input: redondeada a 6 decimales, sin ceros de más. */
export function formatCoordinate(value: unknown): string {
  const n = typeof value === "string" ? Number(value.trim()) : value
  if (typeof n !== "number" || !Number.isFinite(n)) return ""
  if (typeof value === "string" && value.trim() === "") return ""
  return String(Number(n.toFixed(COORDINATE_DECIMALS)))
}

/** Cantidades con punto de miles, como se leen en Argentina: 2.451. */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return "0"
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

const AR_TZ = "America/Argentina/Buenos_Aires"

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === "") return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function arParts(d: Date) {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: AR_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return {
    day: get("day"),
    month: get("month").replace(/\.$/, ""),
    year: get("year"),
    time: `${get("hour")}:${get("minute")}`,
  }
}

/**
 * Fecha del admin, una sola forma en todas las pantallas: "11 oct" (este año)
 * o "11 oct 2025". Siempre en hora de Argentina, así el servidor y el navegador
 * dicen lo mismo.
 */
export function formatAdminDate(value: string | number | Date | null | undefined, now: Date = new Date()): string {
  const d = toDate(value)
  if (!d) return "—"
  const p = arParts(d)
  return p.year === arParts(now).year ? `${p.day} ${p.month}` : `${p.day} ${p.month} ${p.year}`
}

/** Fecha y hora: "11 oct, 14:05" (o "11 oct 2025, 14:05"). */
export function formatAdminDateTime(value: string | number | Date | null | undefined, now: Date = new Date()): string {
  const d = toDate(value)
  if (!d) return "—"
  return `${formatAdminDate(d, now)}, ${arParts(d).time}`
}
