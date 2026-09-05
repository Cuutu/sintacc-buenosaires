/**
 * Parsea horarios en formato libre (ej: "Lun-Vie 9-18, Sáb 10-14")
 * y determina si el lugar está abierto ahora.
 * Usa timezone Argentina (America/Argentina/Buenos_Aires).
 */

const ARGENTINA_OFFSET = -3 // UTC-3

function getLocalMinutes(now: Date): number {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const localMinutes = utcMinutes + ARGENTINA_OFFSET * 60
  return ((localMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
}

function getLocalDay(now: Date): number {
  const utcHours = now.getUTCHours()
  const localDay = now.getUTCDay() + (utcHours + ARGENTINA_OFFSET < 0 ? -1 : 0)
  return ((localDay % 7) + 7) % 7
}

// 0 = Domingo, 1 = Lun, ..., 6 = Sáb
const DAY_NAMES: Record<string, number> = {
  dom: 0, domin: 0, domingo: 0,
  lun: 1, lunes: 1,
  mar: 2, martes: 2,
  mie: 3, mié: 3, mier: 3, miér: 3, miercoles: 3, miércoles: 3,
  jue: 4, jueves: 4,
  vie: 5, viernes: 5,
  sab: 6, sáb: 6, sabado: 6, sábado: 6,
}

function parseTimeStr(str: string): number | null {
  const m = str.trim().match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|hs?)?$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  const ampm = (m[3] || "").toLowerCase()
  if (ampm === "pm" && h < 12) h += 12
  if (ampm === "am" && h === 12) h = 0
  return Math.min(23 * 60 + 59, h * 60 + min)
}

function parseDayRange(str: string): number[] | null {
  const s = str.toLowerCase().trim()
  if (s.includes("-") || s.includes(" a ")) {
    const parts = s.split(/\s*[-–a]\s*/).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const from = DAY_NAMES[parts[0].slice(0, 3)] ?? DAY_NAMES[parts[0]]
      const to = DAY_NAMES[parts[parts.length - 1].slice(0, 3)] ?? DAY_NAMES[parts[parts.length - 1]]
      if (from != null && to != null) {
        const days: number[] = []
        let d = from
        while (true) {
          days.push(d)
          if (d === to) break
          d = (d + 1) % 7
        }
        return days
      }
    }
  }
  const single = DAY_NAMES[s.slice(0, 3)] ?? DAY_NAMES[s]
  if (single != null) return [single]
  return null
}

type ParsedOpenStatus = {
  open: boolean
  closeMinutes?: number
}

function formatClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${h}:${String(m).padStart(2, "0")}`
}

function parseOpenStatus(
  openingHours: string | undefined | null,
  now: Date
): ParsedOpenStatus | null {
  if (!openingHours || !openingHours.trim()) return null

  const s = openingHours.toLowerCase().trim()
  if (s === "cerrado") return { open: false }
  if (/^24\s*(hs?|horas?)?$/i.test(s) || s === "24h") return { open: true }

  const nowMinutes = getLocalMinutes(now)
  const nowDay = getLocalDay(now)
  const segments = s
    .split(/[\n,;]+/)
    .map((seg) => seg.trim())
    .filter(Boolean)

  let matchedDay = false

  for (const seg of segments) {
    const dayPart = seg.replace(/:.+$/, " ").replace(/\d.+$/, " ").trim()
    const days = dayPart ? parseDayRange(dayPart) : null
    if (days && !days.includes(nowDay)) continue
    if (days) matchedDay = true

    if (/\bcerrado\b/.test(seg)) {
      if (days?.includes(nowDay) || (!days && segments.length === 1)) return { open: false }
      continue
    }

    const timeMatch = seg.match(
      /(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|hs?)?)\s*[-–a]\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm|hs?)?)/i
    )
    if (!timeMatch) continue
    const openM = parseTimeStr(timeMatch[1])
    const closeM = parseTimeStr(timeMatch[2])
    if (openM == null || closeM == null) continue
    const applies = days ? days.includes(nowDay) : true
    if (!applies) continue
    matchedDay = true
    const isOpen =
      closeM > openM
        ? nowMinutes >= openM && nowMinutes < closeM
        : nowMinutes >= openM || nowMinutes < closeM
    if (isOpen) return { open: true, closeMinutes: closeM }
    if (days) return { open: false }
  }

  return matchedDay ? { open: false } : null
}

/**
 * Parsea horarios comunes y retorna si está abierto.
 * Retorna null si no se puede interpretar.
 */
export function isOpenNow(
  openingHours: string | undefined | null,
  now: Date = new Date()
): boolean | null {
  const status = parseOpenStatus(openingHours, now)
  return status ? status.open : null
}

/** Etiqueta corta para ficha/lista. Null si no hay horario interpretable. */
export function getOpenStatusLabel(
  openingHours: string | undefined | null,
  now: Date = new Date()
): string | null {
  const status = parseOpenStatus(openingHours, now)
  if (!status) return null
  if (!status.open) return "Cerrado"
  if (status.closeMinutes != null) return `Cierra a las ${formatClock(status.closeMinutes)}`
  return "Abierto ahora"
}

export const WEEK_DAYS = [
  { key: "lun", label: "Lunes", aliases: ["lun", "lunes", "l"] },
  { key: "mar", label: "Martes", aliases: ["mar", "martes"] },
  { key: "mie", label: "Miércoles", aliases: ["mie", "mié", "miercoles", "miércoles", "x"] },
  { key: "jue", label: "Jueves", aliases: ["jue", "jueves"] },
  { key: "vie", label: "Viernes", aliases: ["vie", "viernes"] },
  { key: "sab", label: "Sábado", aliases: ["sab", "sáb", "sabado", "sábado"] },
  { key: "dom", label: "Domingo", aliases: ["dom", "domingo"] },
] as const

export type DayHours = { open: string; close: string; closed: boolean }

export type WeekHours = Record<(typeof WEEK_DAYS)[number]["key"], DayHours>

export function emptyWeekHours(): WeekHours {
  return Object.fromEntries(
    WEEK_DAYS.map((d) => [d.key, { open: "09:00", close: "18:00", closed: true }])
  ) as WeekHours
}

export function parseOpeningHours(raw?: string): WeekHours {
  const week = emptyWeekHours()
  if (!raw?.trim()) return week

  const chunks = raw
    .split(/[·\n|;]+/)
    .map((c) => c.trim())
    .filter(Boolean)

  for (const chunk of chunks) {
    const day = WEEK_DAYS.find((d) =>
      d.aliases.some((alias) => chunk.toLowerCase().startsWith(alias))
    )
    if (!day) continue
    const times = chunk.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/)
    if (!times) continue
    week[day.key] = {
      open: times[1].padStart(5, "0"),
      close: times[2].padStart(5, "0"),
      closed: false,
    }
  }
  return week
}

export function formatOpeningHours(week: WeekHours): string {
  return WEEK_DAYS.filter((d) => !week[d.key].closed)
    .map((d) => `${d.label.slice(0, 3)} ${week[d.key].open}–${week[d.key].close}`)
    .join(" · ")
}
