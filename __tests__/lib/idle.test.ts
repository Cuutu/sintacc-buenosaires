/**
 * @jest-environment jsdom
 */
import { runAfterLoadWhenIdle } from "@/lib/idle"

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  cancelIdleCallback?: (id: number) => void
}

function setReadyState(value: DocumentReadyState) {
  Object.defineProperty(document, "readyState", { configurable: true, get: () => value })
}

describe("runAfterLoadWhenIdle", () => {
  const w = window as IdleWindow

  beforeEach(() => {
    jest.useFakeTimers()
    Reflect.deleteProperty(w, "requestIdleCallback")
    Reflect.deleteProperty(w, "cancelIdleCallback")
  })

  afterEach(() => {
    jest.useRealTimers()
    setReadyState("complete")
  })

  it("si la página sigue cargando, espera el load", () => {
    setReadyState("loading")
    const fn = jest.fn()
    runAfterLoadWhenIdle(fn, { fallbackMs: 100 })
    jest.advanceTimersByTime(1000)
    expect(fn).not.toHaveBeenCalled()
    window.dispatchEvent(new Event("load"))
    jest.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("con requestIdleCallback, lo usa con timeout", () => {
    setReadyState("complete")
    const fn = jest.fn()
    let idleCb: (() => void) | undefined
    w.requestIdleCallback = jest.fn((cb: () => void) => {
      idleCb = cb
      return 7
    })
    runAfterLoadWhenIdle(fn, { timeoutMs: 2500 })
    expect(w.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2500 })
    expect(fn).not.toHaveBeenCalled()
    idleCb?.()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("cancelar antes de que corra lo evita", () => {
    setReadyState("loading")
    const fn = jest.fn()
    const cancel = runAfterLoadWhenIdle(fn, { fallbackMs: 50 })
    cancel()
    window.dispatchEvent(new Event("load"))
    jest.advanceTimersByTime(500)
    expect(fn).not.toHaveBeenCalled()
  })
})
