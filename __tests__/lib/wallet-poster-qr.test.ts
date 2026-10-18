/**
 * @jest-environment node
 */
import { create } from "qrcode"
import { posterQr } from "@/lib/wallet/poster-qr"
import { parsePosterSize, posterCss } from "@/lib/wallet/poster-print"

const URL = "https://www.celimap.com.ar/tarjeta/6650a1b2c3d4e5f601234567"

/** Módulos que pinta el path de datos ("M{x} {y}h{n}v1h-{n}z" por tramo). */
function paintedModules(path: string): string[] {
  const cells: string[] = []
  for (const [, x, y, run] of Array.from(path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g))) {
    for (let i = 0; i < Number(run); i++) cells.push(`${Number(x) + i},${y}`)
  }
  return cells
}

describe("QR del cartel", () => {
  it("paints every dark module except the eyes and the logo hole, once", () => {
    const qr = posterQr(URL)
    const { modules } = create(URL, { errorCorrectionLevel: "Q" })
    expect(qr.size).toBe(modules.size)
    const logo = qr.logo!
    const inEye = (x: number, y: number) =>
      (x < 7 && y < 7) || (x >= qr.size - 7 && y < 7) || (x < 7 && y >= qr.size - 7)
    const inLogo = (x: number, y: number) =>
      x >= logo.x && x < logo.x + logo.size && y >= logo.y && y < logo.y + logo.size

    const expected: string[] = []
    for (let y = 0; y < qr.size; y++) {
      for (let x = 0; x < qr.size; x++) {
        if (modules.get(y, x) && !inEye(x, y) && !inLogo(x, y)) expected.push(`${x},${y}`)
      }
    }
    const painted = paintedModules(qr.dataPath)
    expect(new Set(painted).size).toBe(painted.length)
    expect(painted.sort()).toEqual(expected.sort())
    expect(qr.eyes).toHaveLength(3)
  })

  it("keeps the logo small and centered", () => {
    const { size, logo } = posterQr(URL)
    expect(logo).not.toBeNull()
    expect(logo!.size % 2).toBe(1)
    expect(logo!.size).toBeLessThanOrEqual(size * 0.2)
    expect(logo!.x * 2 + logo!.size).toBe(size)
    expect(logo!.y).toBe(logo!.x)
  })

  it("leaves the center alone when the code needs a bigger version", () => {
    expect(posterQr(`${URL}?${"x".repeat(120)}`).logo).toBeNull()
  })
})

describe("impresión del cartel", () => {
  it("prints A5 unless A4 is asked for", () => {
    expect(parsePosterSize(undefined)).toBe("a5")
    expect(parsePosterSize("A4")).toBe("a5")
    expect(parsePosterSize("a4")).toBe("a4")
    expect(posterCss("a5")).toContain("size: A5 portrait")
    expect(posterCss("a4")).toContain("size: A4 portrait")
    expect(posterCss("a4")).toContain("--u-print: 1.41421mm")
  })

  it("only hides the rest of the page while the poster is on it", () => {
    const css = posterCss("a5")
    const hideRule = css.split("\n").find((line) => line.includes("display: none"))
    expect(hideRule?.startsWith("  body:has([data-cartel])")).toBe(true)
  })
})
