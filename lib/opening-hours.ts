/**
 * Parsea horarios en formato libre (ej: "Lun-Vie 9-18, Sáb 10-14")
 * y determina si el lugar está abierto ahora.
 * Usa timezone Argentina (America/Argentina/Buenos_Aires).
 */

const ARGENTINA_OFFSET = -3 // UTC-3

function getLocalMinutes(): number {
  const now = new Date()
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const localMinutes = utcMinutes + ARGENTINA_OFFSET * 60
  return ((localMinutes % (24 * 60)) + 24 * 60) % (24 * 60)
}

function getLocalDay(): number {
  const now = new Date()
  const utcHours = now.getUTCHours()
  const localDay = now.getUTCDay() + (utcHours + ARGENTINA_OFFSET < 0 ? -1 : 0)
  return ((localDay % 7) + 7) % 7
}

// 0 = Domingo, 1 = Lun, ..., 6 = Sáb
const DAY_NAMES: Record<string, number> = {
  dom: 0, domin: 0, "domingo": 0,
  lun: 1, lunes: 1,
  mar: 2, martes: 2,
  mie: 3, mié: 3, mier: 3, miér: 3, "miercoles": 3, "miércoles": 3,
  jue: 4, jueves: 4,
  vie: 5, viernes: 5,
  sab: 6, sáb: 6, sabado: 6, "sábado": 6,
}

function parseTimeStr(str: string): number | null {
  const m = str.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm|hs?)?$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2] ? parseInt(m[2], 10) : 0
  const ampm = (m[3] || "").toLowerCase()
  if (ampm === "pm" && h < 12) h += 12
  if (ampm === "am" && h === 12) h = 0
  if (!ampm && h <= 23) {
    // 24h format
  }
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

/**
 * Parsea horarios comunes y retorna si está abierto.
 * Retorna null si no se puede interpretar.
 */
export function isOpenNow(openingHours: string | undefined | null): boolean | null {
  if (!openingHours || !openingHours.trim()) return null

  const s = openingHours.toLowerCase().trim()

  if (s.includes("cerrado") || s === "cerrado") return false
  if (/^24\s*(hs?|horas?)?$/i.test(s) || s === "24h") return true

  const nowMinutes = getLocalMinutes()
  const nowDay = getLocalDay()

  const segments = s.split(/[,;y]/).map((seg) => seg.trim()).filter(Boolean)

  for (const seg of segments) {
    const timeMatch = seg.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm|hs?)?)\s*[-–a]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|hs?)?)/i)
    if (timeMatch) {
      const openM = parseTimeStr(timeMatch[1])
      const closeM = parseTimeStr(timeMatch[2])
      if (openM != null && closeM != null) {
        const dayPart = seg.replace(timeMatch[0], "").trim()
        const days = dayPart ? parseDayRange(dayPart) : [0, 1, 2, 3, 4, 5, 6]
        if (days && days.includes(nowDay)) {
          const isOpen = closeM > openM
            ? nowMinutes >= openM && nowMinutes < closeM
            : nowMinutes >= openM || nowMinutes < closeM
          if (isOpen) return true
        }
      }
    }

    const simpleTime = seg.match(/^(\d{1,2}(?::\d{2})?)\s*[-–a]\s*(\d{1,2}(?::\d{2})?)\s*(?:hs?)?$/i)
    if (simpleTime) {
      const openM = parseTimeStr(simpleTime[1])
      const closeM = parseTimeStr(simpleTime[2])
      if (openM != null && closeM != null) {
        const dayPart = seg.replace(simpleTime[0], "").trim()
        const days = dayPart ? parseDayRange(dayPart) : [0, 1, 2, 3, 4, 5, 6]
        if (days && days.includes(nowDay)) {
          const isOpen = closeM > openM
            ? nowMinutes >= openM && nowMinutes < closeM
            : nowMinutes >= openM || nowMinutes < closeM
          if (isOpen) return true
        }
      }
    }
  }

  return null
}
