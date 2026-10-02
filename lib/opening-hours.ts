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
  `(?<!\\d)(${TIME_TOKEN})\\s*(?:[–—-]|\\ba\\b)\\s*(${TIME_TOKEN})(?!\\d)`,
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
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

function parseDayToken(token: string): number | null {
  const t = token.trim().replace(/\.$/, "")
  return DAY_NAMES[t] ?? DAY_NAMES[t.slice(0, 3)] ?? null
}

/** "lun-vie", "lunes a viernes", "sábados y domingos". Null si no nombra ningún día. */
function parseDayRange(str: string): number[] | null {
  const s = str.toLowerCase().replace(/\bde\b/g, " ").trim()
  const days = new Set<number>()
  for (const part of s.split(/\s*(?:\by\b|\/|&)\s*/)) {
    const ends = part.split(/\s*(?:[-–—]|\ba\b|\bal\b)\s*/).filter(Boolean)
    if (ends.length >= 2) {
      const from = parseDayToken(ends[0])
      const to = parseDayToken(ends[ends.length - 1])
      if (from == null) continue
      // "Lunes - Cerrado": lo que sigue al guion no es un día.
      if (to == null) {
        days.add(from)
        continue
      }
      for (let d = from; ; d = (d + 1) % 7) {
        days.add(d)
        if (d === to) break
      }
    } else if (ends.length === 1) {
      const day = parseDayToken(ends[0])
      if (day != null) days.add(day)
    }
  }
  return days.size ? Array.from(days) : null
}

type ParsedOpenStatus = {
  open: boolean
  closeMinutes?: number
  /** Minutos hasta el cierre (si está abierto) o hasta la próxima apertura (si está cerrado). */
  minutesUntilChange?: number
}

const DAY_MINUTES = 24 * 60
const WEEK_MINUTES = 7 * DAY_MINUTES

/** Minutos desde el domingo 00:00. `end` puede pasar de la semana (sábado que cierra de madrugada). */
type WeeklyInterval = { start: number; end: number }

function meridiem(str: string): "a" | "p" | null {
  const m = str.trim().match(/([ap])\.?\s*m\.?$/i)
  return m ? (m[1].toLowerCase() as "a" | "p") : null
}

/**
 * Google omite a.m./p.m. en la apertura cuando coincide con el cierre:
 * "7:00 – 11:00 p.m." es 19 a 23 hs, "12:00 – 3:00 p.m." es 12 a 15 hs.
 */
function parseTimeRange(openStr: string, closeStr: string): [number, number] | null {
  let open = parseTimeStr(openStr)
  const close = parseTimeStr(closeStr)
  if (open == null || close == null) return null
  const closeSuffix = meridiem(closeStr)
  if (!meridiem(openStr) && closeSuffix && !/hs?\s*$/i.test(openStr.trim())) {
    const inherited = parseTimeStr(`${openStr.trim()} ${closeSuffix}m`)
    if (inherited != null && inherited < (close || DAY_MINUTES)) open = inherited
  }
  return [open, close]
}

/**
 * Horario de texto libre (manual o weekdayDescriptions de Google) → intervalos semanales.
 * Null si no se puede interpretar nada.
 */
function parseWeeklyIntervals(openingHours: string | undefined | null): WeeklyInterval[] | null {
  if (!openingHours || !openingHours.trim()) return null

  const s = repairUtf8Mojibake(openingHours)
    .toLowerCase()
    .replace(/[   ]/g, " ")
    .replace(/\b([ap])\.\s+m\./g, "$1.m.")
    .trim()
  const allDays = [0, 1, 2, 3, 4, 5, 6]
  const fullDays = (days: number[]) =>
    days.map((d) => ({ start: d * DAY_MINUTES, end: (d + 1) * DAY_MINUTES }))

  if (s === "cerrado") return []
  if (/^24\s*(hs?|horas?)?$/i.test(s) || s === "24h") return fullDays(allDays)

  const segments = s
    .split(/[\n,;·•|]+|\.(?=\s*(?:lun|mar|mie|mié|jue|vie|sab|sáb|dom)\b)/)
    .map((seg) => seg.trim())
    .filter(Boolean)

  const intervals: WeeklyInterval[] = []
  const closedDays = new Set<number>()
  let interpretable = false
  // Tramos sin rango horario claro ("desde las 19 horas"): si no hay ningún rango, mejor no inventar "Cerrado".
  let unknownSegments = 0
  // "Lun-Sab 9 a 13, 18 a 21": el rango después de la coma sigue siendo de Lun-Sab.
  let previousDays: number[] | null = null

  for (const seg of segments) {
    const dayPart = seg.replace(/:.+$/, " ").replace(/\d.+$/, " ").trim()
    const ownDays = dayPart ? parseDayRange(dayPart) : null
    const days = dayPart ? ownDays ?? allDays : previousDays ?? allDays
    if (dayPart) previousDays = ownDays

    const timeMatches = Array.from(seg.matchAll(new RegExp(TIME_RANGE_RE.source, "gi")))

    if (timeMatches.length === 0) {
      // "Lunes - Abierto 24 horas" / "lunes: Abierto las 24 horas". El tramo tiene que terminar ahí:
      // una nota que menciona "24h" no vuelve el lugar 24/7.
      const is24h =
        !/\bcerrado\b/.test(seg) && /^[^\d]*?(abierto\s+(las\s+)?)?\b24\s*(hs?|horas?)\.?$/.test(seg)
      if (is24h) {
        intervals.push(...fullDays(days))
        interpretable = true
      } else if (/\bcerrado\b/.test(seg) && (ownDays || segments.length === 1)) {
        ;(ownDays ?? allDays).forEach((d) => closedDays.add(d))
        interpretable = true
      } else if (/\d/.test(seg)) {
        unknownSegments++
      }
      continue
    }

    for (const timeMatch of timeMatches) {
      const range = parseTimeRange(timeMatch[1], timeMatch[2])
      if (!range) continue
      const [open, close] = range
      interpretable = true
      for (const d of days) {
        const start = d * DAY_MINUTES + open
        const end = d * DAY_MINUTES + (close > open ? close : close + DAY_MINUTES)
        intervals.push({ start, end })
      }
    }
  }

  if (!interpretable) return null
  const open = intervals.filter((iv) => !closedDays.has(Math.floor(iv.start / DAY_MINUTES)))
  if (open.length === 0 && unknownSegments > 0) return null
  return open
}

function evaluateIntervals(intervals: WeeklyInterval[], now: Date): ParsedOpenStatus {
  const { day, minutes } = getArgentinaClock(now)
  const t = day * DAY_MINUTES + minutes
  // Semana anterior y siguiente: el sábado que cierra de madrugada abre el domingo, etc.
  const timeline = intervals.flatMap((iv) =>
    [-WEEK_MINUTES, 0, WEEK_MINUTES].map((o) => ({ start: iv.start + o, end: iv.end + o }))
  )

  const current = timeline.find((iv) => t >= iv.start && t < iv.end)
  if (current) {
    // Encadenar intervalos contiguos (24 hs todos los días, o cierre 00:00 + apertura 00:00).
    let end = current.end
    for (let guard = 0; guard < 50; guard++) {
      const next = timeline.find((iv) => iv.start <= end && iv.end > end)
      if (!next) break
      end = next.end
      if (end - t >= WEEK_MINUTES) return { open: true }
    }
    return { open: true, closeMinutes: end % DAY_MINUTES, minutesUntilChange: end - t }
  }

  const upcoming = timeline.filter((iv) => iv.start > t).map((iv) => iv.start - t)
  return { open: false, minutesUntilChange: upcoming.length ? Math.min(...upcoming) : undefined }
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
  const intervals = parseWeeklyIntervals(openingHours)
  return intervals ? evaluateIntervals(intervals, now) : null
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

const DAY_LABELS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]

/** "abre en 25 min", o "abre el lunes a las 9:00" si falta más de un día. */
function formatNextOpening(minutesUntil: number, now: Date): string {
  if (minutesUntil < DAY_MINUTES) return `abre en ${formatRelativeTime(minutesUntil)}`
  const { day, minutes } = getArgentinaClock(now)
  const target = minutes + minutesUntil
  const targetDay = (day + Math.floor(target / DAY_MINUTES)) % 7
  return `abre el ${DAY_LABELS[targetDay]} a las ${formatClock(target % DAY_MINUTES)}`
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
    return {
      isOpen: false,
      label: "Cerrado",
      ...(status.minutesUntilChange != null && {
        relativeText: formatNextOpening(status.minutesUntilChange, now),
      }),
      fullSchedule,
    }
  }

  if (status.minutesUntilChange != null && status.minutesUntilChange <= 90) {
    return {
      isOpen: true,
      label: "Abierto",
      relativeText: `cierra en ${formatRelativeTime(status.minutesUntilChange)}`,
      fullSchedule,
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
