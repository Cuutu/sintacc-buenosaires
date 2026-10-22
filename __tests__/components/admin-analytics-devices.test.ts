import { summarizeDevices } from "@/components/admin/insights/InsightsWorkspace"

const now = Date.parse("2026-10-21T15:00:00Z")
const row = (id: string, platform: string, appVersion: string, minutesAgo: number, device = "mobile") => ({
  id,
  platform,
  device,
  appVersion,
  lastTs: new Date(now - minutesAgo * 60_000).toISOString(),
})

describe("Analytics: dispositivos resumidos", () => {
  it("agrupa por plataforma y versión, cuenta activos ahora y ordena por cantidad", () => {
    const groups = summarizeDevices(
      [
        row("a", "android_native", "1.2.0", 1),
        row("b", "android_native", "1.2.0", 120),
        row("c", "android_native", "1.0.0", 600),
        row("d", "web", "", 30),
        row("e", "web", "", 3000),
        row("f", "web", "", 60),
        row("g", "ios_native", "1.15", 2),
      ],
      now
    )
    expect(groups.map((g) => [g.platform, g.version, g.devices, g.activeNow])).toEqual([
      ["Web / Móvil", "Sin versión", 3, 0],
      ["Android", "1.2.0", 2, 1],
      ["iOS", "1.15", 1, 1],
      ["Android", "1.0.0", 1, 0],
    ])
    expect(groups[1].lastTs).toBe(now - 60_000)
  })

  it("sin filas no hay grupos", () => {
    expect(summarizeDevices([], now)).toEqual([])
  })
})
