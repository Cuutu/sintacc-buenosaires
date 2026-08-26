import {
  ANALYTICS_COLD_START_KEY,
  ANALYTICS_FIRST_OPEN_KEY,
  ANALYTICS_LAST_ACTIVITY_KEY,
  ANALYTICS_OPEN_DEBOUNCE_KEY,
  ANALYTICS_OPEN_DEBOUNCE_MS,
  ANALYTICS_SESSION_TIMEOUT_MS,
  runAnalyticsLifecycleOpen,
  type AnalyticsLifecycleStorage,
} from "@/lib/analytics-session"

function createMemoryStorage(initial: Record<string, string> = {}): AnalyticsLifecycleStorage {
  const map = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
  }
}

describe("runAnalyticsLifecycleOpen", () => {
  const platform = "web" as const

  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2026-08-25T12:00:00.000Z"))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("first_open dispara una sola vez", () => {
    const storage = createMemoryStorage()
    const track = jest.fn()

    runAnalyticsLifecycleOpen({ storage, track, platform, reason: "cold_start" })
    runAnalyticsLifecycleOpen({
      storage,
      track,
      platform,
      reason: "foreground",
      now: Date.now() + ANALYTICS_OPEN_DEBOUNCE_MS + 1,
    })

    expect(track).toHaveBeenCalledWith("first_open", { platform })
    expect(track.mock.calls.filter(([e]) => e === "first_open")).toHaveLength(1)
    expect(storage.getItem(ANALYTICS_FIRST_OPEN_KEY)).toBe("1")
  })

  it("storage corrupto en last activity no rompe y abre nueva sesión", () => {
    const storage = createMemoryStorage({
      [ANALYTICS_FIRST_OPEN_KEY]: "1",
      [ANALYTICS_LAST_ACTIVITY_KEY]: "not-a-number",
    })
    const track = jest.fn()

    expect(() =>
      runAnalyticsLifecycleOpen({ storage, track, platform, reason: "cold_start" })
    ).not.toThrow()

    expect(track).toHaveBeenCalledWith("session_start", { platform })
  })

  it("track fallido no rompe la ejecución", () => {
    const storage = createMemoryStorage()
    const track = jest.fn(() => {
      throw new Error("analytics down")
    })

    expect(() =>
      runAnalyticsLifecycleOpen({ storage, track, platform, reason: "cold_start" })
    ).not.toThrow()
  })

  it("session_start en primera apertura y no en navegación interna simulada", () => {
    const storage = createMemoryStorage()
    const track = jest.fn()
    const now = Date.now()

    runAnalyticsLifecycleOpen({ storage, track, platform, reason: "cold_start", now })

    expect(track).toHaveBeenCalledWith("session_start", { platform })

    track.mockClear()
    runAnalyticsLifecycleOpen({
      storage,
      track,
      platform,
      reason: "visibility",
      now: now + 5 * 60 * 1000,
    })

    expect(track).not.toHaveBeenCalledWith("session_start", { platform })
  })

  it("no genera session_start si actividad < 30 min", () => {
    const storage = createMemoryStorage({
      [ANALYTICS_FIRST_OPEN_KEY]: "1",
      [ANALYTICS_LAST_ACTIVITY_KEY]: String(Date.now()),
    })
    const track = jest.fn()

    runAnalyticsLifecycleOpen({
      storage,
      track,
      platform,
      reason: "foreground",
      now: Date.now() + 10 * 60 * 1000,
    })

    expect(track).toHaveBeenCalledWith("app_open", { platform })
    expect(track).not.toHaveBeenCalledWith("session_start", { platform })
  })

  it("genera session_start después de > 30 min", () => {
    const storage = createMemoryStorage({
      [ANALYTICS_FIRST_OPEN_KEY]: "1",
      [ANALYTICS_LAST_ACTIVITY_KEY]: String(Date.now()),
    })
    const track = jest.fn()

    runAnalyticsLifecycleOpen({
      storage,
      track,
      platform,
      reason: "foreground",
      now: Date.now() + ANALYTICS_SESSION_TIMEOUT_MS + 1,
    })

    expect(track).toHaveBeenCalledWith("session_start", { platform })
  })

  it("cold_start no se duplica en la misma pestaña", () => {
    const storage = createMemoryStorage()
    const track = jest.fn()

    runAnalyticsLifecycleOpen({ storage, track, platform, reason: "cold_start" })
    runAnalyticsLifecycleOpen({ storage, track, platform, reason: "cold_start" })

    expect(track.mock.calls.filter(([e]) => e === "app_open")).toHaveLength(1)
    expect(storage.getItem(ANALYTICS_COLD_START_KEY)).toBe("1")
  })

  it("debounce evita app_open duplicado en cold start + foreground inmediato", () => {
    const storage = createMemoryStorage()
    const track = jest.fn()
    const now = Date.now()

    runAnalyticsLifecycleOpen({ storage, track, platform, reason: "cold_start", now })
    runAnalyticsLifecycleOpen({ storage, track, platform, reason: "foreground", now: now + 100 })

    expect(track.mock.calls.filter(([e]) => e === "app_open")).toHaveLength(1)
    expect(storage.getItem(ANALYTICS_OPEN_DEBOUNCE_KEY)).toBe(String(now))
  })
})
