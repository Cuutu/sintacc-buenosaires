import { execSync } from "child_process"
import path from "path"
import config from "../../tailwind.config"

const root = path.join(__dirname, "../..")

// Escala de opacidad por defecto de Tailwind 3.4.
const DEFAULT_SCALE = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]
// navbar.tsx: supports-[backdrop-filter]:bg-cream/72 y /62 nunca generaron CSS y
// el rediseño se aprobó viéndose sin ellas. Se dejan así a propósito.
const KNOWN_NO_OP = new Set(["bg-cream/62", "bg-cream/72"])

describe("opacidades de color de Tailwind", () => {
  it("toda clase color/N usa un valor que Tailwind genera", () => {
    const extended = Object.keys(
      ((config.theme?.extend as Record<string, unknown> | undefined)?.opacity ?? {}) as Record<string, string>
    ).map(Number)
    const valid = new Set([...DEFAULT_SCALE, ...extended])
    const out = execSync(
      'git grep -hoE "(bg|text|border|ring|divide|fill|stroke|outline|decoration|accent|caret|shadow)-[a-z]+(-[0-9]{2,3})?/[0-9]{1,3}" -- app components lib',
      { cwd: root, encoding: "utf8" }
    )
    const invalid = [...new Set(out.split("\n").filter(Boolean))].filter((cls) => {
      const n = Number(cls.split("/")[1])
      return !valid.has(n) && !KNOWN_NO_OP.has(cls)
    })
    expect(invalid).toEqual([])
  })
})
