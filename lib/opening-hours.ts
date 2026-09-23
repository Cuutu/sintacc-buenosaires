/**
 * Parsea horarios en formato libre (ej: "Lun-Vie 9-18, Sáb 10-14")
 * y determina si el lugar está abierto ahora.
 * Reloj: America/Argentina/Buenos_Aires (UTC-3).
 */

const AR_TZ = "America/Argentina/Buenos_Aires"

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

function getArgentinaClock(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: AR_TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const weekday = (parts.find((part) => part.type === "weekday")?.value ?? "Sun")
    .slice(0, 3)
    .toLowerCase()
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0)
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0)
  return {
    day: WEEKDAY_TO_INDEX[weekday] ?? 0,
    minutes: hour * 60 + minute,
  }
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

const AMPM = "(?:a\\.?m\\.?|p\\.?m\\.?|am|pm|hs?)"
const TIME_TOKEN = `\\d{1,2}(?:[:.]\\d{2})?\\s*${AMPM}?`
const TIME_RANGE_RE = new RegExp(
  `(${TIME_TOKEN})\\s*(?:[–—-]|\\ba\\b)\\s*(${TIME_TOKEN})`,
  "i"
)
const TIME_PARSE_RE = new RegExp(
  `^(\\d{1,2})(?:[:.](\\d{2}))?\\s*(${AMPM})?$`,
  "i"
)

function parseTimeStr(str: string): number | null {
  const m = str.trim().match(TIME_PARSE_RE)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  const ampm = (m[3] || "").toLowerCase().replace(/\./g, "")
  if (ampm.startsWith("p") && h < 12) h += 12
  if (ampm.startsWith("a") && h === 12) h = 0
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

/** UTF-8 leído como Latin-1: "MiÃ©rcoles" → "Miércoles". */
export function repairUtf8Mojibake(input: string): string {
  if (!/[ÃÂ]/.test(input)) return input
  try {
    const bytes = Uint8Array.from(input, (ch) => ch.charCodeAt(0) & 0xff)
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
    if (!decoded || decoded.includes("\uFFFD") || decoded === input) return input
    return decoded
  } catch {
    return input
  }
}

const DAY_LINE_SPLIT =
  /(?=\b(?:Lunes|Martes|Miércoles|Miercoles|Jueves|Viernes|Sábado|Sabado|Domingo)\b)/gi

/** Líneas de horario para UI. Repara encoding y parte por día. */
export function splitOpeningHoursLines(raw: string): string[] {
  const text = repairUtf8Mojibake(raw).replace(/\s+/g, " ").trim()
  if (!text) return []
  const byPunct = text.split(/[,;|\n]+/).map((part) => part.trim()).filter(Boolean)
  if (byPunct.length > 1) return byPunct
  const byDay = text.split(DAY_LINE_SPLIT).map((part) => part.trim()).filter(Boolean)
  return byDay.length > 1 ? byDay : [text]
}

function parseOpenStatus(
  openingHours: string | undefined | null,
  now: Date
): ParsedOpenStatus | null {
  if (!openingHours || !openingHours.trim()) return null

  const s = repairUtf8Mojibake(openingHours).toLowerCase().trim()
  if (s === "cerrado") return { open: false }
  if (/^24\s*(hs?|horas?)?$/i.test(s) || s === "24h") return { open: true }

  const { day: nowDay, minutes: nowMinutes } = getArgentinaClock(now)
  const segments = s
    .split(/[\n,;]+|\.(?=\s*(?:lun|mar|mie|mié|jue|vie|sab|sáb|dom)\b)/)
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

    const timeMatches = Array.from(seg.matchAll(new RegExp(TIME_RANGE_RE.source, "gi")))
    if (timeMatches.length === 0) continue

    const applies = days ? days.includes(nowDay) : true
    if (!applies) continue
    matchedDay = true

    for (const timeMatch of timeMatches) {
      const openM = parseTimeStr(timeMatch[1])
      const closeM = parseTimeStr(timeMatch[2])
      if (openM == null || closeM == null) continue

      const isOpen =
        closeM > openM
          ? nowMinutes >= openM && nowMinutes < closeM
          : nowMinutes >= openM || nowMinutes < closeM
      if (isOpen) return { open: true, closeMinutes: closeM }
    }
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

type OpeningEvent = {
  dayIndex: number
  minutes: number
}

/**
 * Formatea tiempo relativo en español natural.
 * Ej: 25 min → "25 min", 90 min → "1 h 30 min", 120 min → "2 h"
 */
function formatRelativeTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  if (remainingMins === 0) {
    return `${hours} h`
  }
  return `${hours} h ${remainingMins} min`
}

/**
 * Encuentra el próximo evento (apertura o cierre) en el horario semanal.
 * Retorna el día de la semana (0-6) y minutos desde medianoche.
 */
function findNextEvent(
  openingHours: string | undefined | null,
  now: Date,
  findOpening: boolean
): OpeningEvent | null {
  if (!openingHours || !openingHours.trim()) return null

  const s = repairUtf8Mojibake(openingHours).toLowerCase().trim()
  if (s === "cerrado") return null
  if (/^24\s*(hs?|horas?)?$/i.test(s) || s === "24h") return null

  const { day: nowDay, minutes: nowMinutes } = getArgentinaClock(now)
  const segments = s
    .split(/[\n,;]+|\.(?=\s*(?:lun|mar|mie|mié|jue|vie|sab|sáb|dom)\b)/)
    .map((seg) => seg.trim())
    .filter(Boolean)

  const allEvents: OpeningEvent[] = []

  for (const seg of segments) {
    const dayPart = seg.replace(/:.+$/, " ").replace(/\d.+$/, " ").trim()
    const days = dayPart ? parseDayRange(dayPart) : null

    if (/\bcerrado\b/.test(seg)) continue

    const timeMatches = Array.from(seg.matchAll(new RegExp(TIME_RANGE_RE.source, "gi")))
    if (timeMatches.length === 0) continue

    for (const timeMatch of timeMatches) {
      const openM = parseTimeStr(timeMatch[1])
      const closeM = parseTimeStr(timeMatch[2])
      if (openM == null || closeM == null) continue

      const applicableDays = days ?? [0, 1, 2, 3, 4, 5, 6]
      for (const dayIndex of applicableDays) {
        if (findOpening) {
          allEvents.push({ dayIndex, minutes: openM })
        } else {
          allEvents.push({ dayIndex, minutes: closeM })
        }
      }
    }
  }

  if (allEvents.length === 0) return null

  let closestEvent: OpeningEvent | null = null
  let minDiff = Infinity

  for (const event of allEvents) {
    let dayDiff = event.dayIndex - nowDay
    if (dayDiff < 0) dayDiff += 7
    else if (dayDiff === 0 && event.minutes <= nowMinutes) dayDiff = 7

    const totalMinutesAhead = dayDiff * 24 * 60 + event.minutes - nowMinutes

    if (totalMinutesAhead > 0 && totalMinutesAhead < minDiff) {
      minDiff = totalMinutesAhead
      closestEvent = event
    }
  }

  return closestEvent
}

/**
 * Calcula minutos hasta el próximo evento desde ahora.
 */
function getMinutesUntilEvent(event: OpeningEvent, now: Date): number {
  const { day: nowDay, minutes: nowMinutes } = getArgentinaClock(now)

  let dayDiff = event.dayIndex - nowDay
  if (dayDiff < 0) dayDiff += 7
  else if (dayDiff === 0 && event.minutes <= nowMinutes) dayDiff = 7

  return dayDiff * 24 * 60 + event.minutes - nowMinutes
}

export type OpenStatusDetail = {
  isOpen: boolean
  label: string
  relativeText?: string
  fullSchedule: string[]
}

/**
 * Retorna estado completo del lugar para UI:
 * - isOpen: boolean
 * - label: "Abierto" o "Cerrado"
 * - relativeText: "abre en 25 min" / "cierra en 1 h" (opcional)
 * - fullSchedule: líneas del horario completo
 */
export function getOpenStatusDetail(
  openingHours: string | undefined | null,
  now: Date = new Date()
): OpenStatusDetail | null {
  if (!openingHours || !openingHours.trim()) return null

  const status = parseOpenStatus(openingHours, now)
  if (!status) return null

  const fullSchedule = splitOpeningHoursLines(openingHours)

  if (!status.open) {
    const nextOpen = findNextEvent(openingHours, now, true)
    if (nextOpen) {
      const minutesUntil = getMinutesUntilEvent(nextOpen, now)
      return {
        isOpen: false,
        label: "Cerrado",
        relativeText: `abre en ${formatRelativeTime(minutesUntil)}`,
        fullSchedule,
      }
    }
    return {
      isOpen: false,
      label: "Cerrado",
      fullSchedule,
    }
  }

  const { day: nowDay, minutes: nowMinutes } = getArgentinaClock(now)
  const s = repairUtf8Mojibake(openingHours).toLowerCase().trim()
  const segments = s
    .split(/[\n,;]+|\.(?=\s*(?:lun|mar|mie|mié|jue|vie|sab|sáb|dom)\b)/)
    .map((seg) => seg.trim())
    .filter(Boolean)

  let todayCloseMinutes: number | null = null

  for (const seg of segments) {
    const dayPart = seg.replace(/:.+$/, " ").replace(/\d.+$/, " ").trim()
    const days = dayPart ? parseDayRange(dayPart) : null
    if (days && !days.includes(nowDay)) continue

    const timeMatches = Array.from(seg.matchAll(new RegExp(TIME_RANGE_RE.source, "gi")))
    for (const timeMatch of timeMatches) {
      const openM = parseTimeStr(timeMatch[1])
      const closeM = parseTimeStr(timeMatch[2])
      if (openM == null || closeM == null) continue

      const isInRange =
        closeM > openM
          ? nowMinutes >= openM && nowMinutes < closeM
          : nowMinutes >= openM || nowMinutes < closeM

      if (isInRange) {
        todayCloseMinutes = closeM
        break
      }
    }
    if (todayCloseMinutes != null) break
  }

  if (todayCloseMinutes != null) {
    const minutesUntilClose =
      todayCloseMinutes > nowMinutes
        ? todayCloseMinutes - nowMinutes
        : 24 * 60 - nowMinutes + todayCloseMinutes

    if (minutesUntilClose <= 90) {
      return {
        isOpen: true,
        label: "Abierto",
        relativeText: `cierra en ${formatRelativeTime(minutesUntilClose)}`,
        fullSchedule,
      }
    }
  }

  return {
    isOpen: true,
    label: "Abierto",
    fullSchedule,
  }
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

  const chunks = repairUtf8Mojibake(raw)
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
