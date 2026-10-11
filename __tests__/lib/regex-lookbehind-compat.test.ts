/**
 * @jest-environment node
 *
 * Las apps iOS son un WKWebView: en iOS < 16.4 un regex con lookbehind
 * (`(?<=…)` / `(?<!…)`) es un SyntaxError ("invalid group specifier name") y,
 * si está a nivel de módulo, rompe el chunk entero. Pasó con lib/opening-hours.ts
 * (importado por place-card → home y mapa). Este test evita que vuelva.
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "..", "..")
const DIRS = ["app", "components", "lib", "hooks"]
const LOOKBEHIND = /\(\?<[=!]/

function walk(dir: string, out: string[]) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full)
  }
}

describe("compatibilidad de regex con WebKit viejo", () => {
  it("no hay lookbehind en código de la app", () => {
    const files: string[] = []
    for (const d of DIRS) walk(path.join(root, d), files)
    const offenders = files
      .filter((f) => LOOKBEHIND.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(root, f))
    expect(offenders).toEqual([])
  })
})

describe("TIME_RANGE_RE sin lookbehind mantiene la semántica", () => {
  // Import diferido: si el módulo volviera a tener un regex inválido, falla acá.
  const { getOpenStatusDetail, isOpenNow } = require("@/lib/opening-hours") as typeof import("@/lib/opening-hours")
  // Martes 14/10/2026 11:00 ART = 14:00 UTC
  const tueMorning = new Date("2026-10-14T14:00:00Z")

  it("rango al inicio del texto", () => {
    expect(isOpenNow("09:00–15:00", tueMorning)).toBe(true)
  })

  it("doble turno: el segundo rango se sigue leyendo", () => {
    const detail = getOpenStatusDetail("Lun–Vie 08:00–10:00 y 10:30–12:30", tueMorning)
    expect(detail?.isOpen).toBe(true)
  })

  it("no empieza un rango en medio de un número (teléfono)", () => {
    // "433-8227" no debe leerse como 33–82 ni 3–82.
    expect(isOpenNow("Llamar al 433-8227", tueMorning)).toBeNull()
  })
})
