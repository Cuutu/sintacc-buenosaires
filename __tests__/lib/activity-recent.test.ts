import {
  ACTIVITY_ACTIVE_MS,
  formatRelativeActivity,
  platformActivityLabel,
} from "@/lib/format-relative-activity"
import { sanitizeAppVersion } from "@/lib/analytics-app-version"

describe("actividad reciente", () => {
  it("formato relativo en español", () => {
    const now = Date.parse("2026-09-07T15:00:00.000Z")
    expect(formatRelativeActivity(now - 3_000, now)).toBe("hace 0 segundos")
    expect(formatRelativeActivity(now - 45_000, now)).toBe("hace 45 s")
    expect(formatRelativeActivity(now - 9 * 60 * 60 * 1000, now)).toBe("hace 9 h")
  })

  it("activo = menos de 5 min", () => {
    expect(ACTIVITY_ACTIVE_MS).toBe(5 * 60 * 1000)
  })

  it("labels de plataforma para Play / web", () => {
    expect(platformActivityLabel("android_native", "mobile")).toBe("Android")
    expect(platformActivityLabel("ios_native", "mobile")).toBe("iOS")
    expect(platformActivityLabel("web", "desktop")).toBe("Web / Escritorio")
    expect(platformActivityLabel("web", "mobile")).toBe("Web / Móvil")
  })

  it("version nativa limpia", () => {
    expect(sanitizeAppVersion("1.0.0 (12)")).toBe("1.0.0 (12)")
    expect(sanitizeAppVersion("user@x.com")).toBe("")
  })
})
