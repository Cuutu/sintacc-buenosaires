import { pollWhileVisible, queueHasPendingWork } from "@/lib/admin-queue-polling"

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state })
  document.dispatchEvent(new Event("visibilitychange"))
}

describe("pollWhileVisible", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    setVisibility("visible")
  })

  afterEach(() => {
    jest.useRealTimers()
    setVisibility("visible")
  })

  it("pollea con la pestaña visible, sin tick inmediato al arrancar", () => {
    const tick = jest.fn()
    const stop = pollWhileVisible(tick, 5000)
    expect(tick).not.toHaveBeenCalled()
    jest.advanceTimersByTime(15_000)
    expect(tick).toHaveBeenCalledTimes(3)
    stop()
  })

  it("se frena oculta y al volver hace un tick y reanuda", () => {
    const tick = jest.fn()
    const stop = pollWhileVisible(tick, 5000)
    setVisibility("hidden")
    jest.advanceTimersByTime(60_000)
    expect(tick).not.toHaveBeenCalled()

    setVisibility("visible")
    expect(tick).toHaveBeenCalledTimes(1)
    jest.advanceTimersByTime(5000)
    expect(tick).toHaveBeenCalledTimes(2)
    stop()
  })

  it("si arranca oculta no pollea hasta volver a estar visible", () => {
    setVisibility("hidden")
    const tick = jest.fn()
    const stop = pollWhileVisible(tick, 5000)
    jest.advanceTimersByTime(30_000)
    expect(tick).not.toHaveBeenCalled()
    setVisibility("visible")
    expect(tick).toHaveBeenCalledTimes(1)
    stop()
  })

  it("la limpieza corta el timer y el listener", () => {
    const tick = jest.fn()
    const stop = pollWhileVisible(tick, 5000)
    stop()
    jest.advanceTimersByTime(30_000)
    setVisibility("hidden")
    setVisibility("visible")
    expect(tick).not.toHaveBeenCalled()
  })
})

describe("queueHasPendingWork", () => {
  it("hay trabajo con jobs encolados o corriendo", () => {
    expect(queueHasPendingWork({ queued: 3, running: 0 })).toBe(true)
    expect(queueHasPendingWork({ queued: 0, running: 1 })).toBe(true)
  })

  it("no hay trabajo con la cola vacía o sin stats", () => {
    expect(queueHasPendingWork({ queued: 0, running: 0 })).toBe(false)
    expect(queueHasPendingWork(null)).toBe(false)
    expect(queueHasPendingWork(undefined)).toBe(false)
  })
})
