import type { Map as MapboxMapType } from "mapbox-gl"
import { whenStyleReady } from "@/components/map-view/map-webgl-layers"

type Handler = () => void

function fakeMap(styleLoaded: boolean) {
  const handlers = new Map<string, Set<Handler>>()
  const state = { styleLoaded }
  const map = {
    isStyleLoaded: () => state.styleLoaded,
    on: (type: string, fn: Handler) => {
      if (!handlers.has(type)) handlers.set(type, new Set())
      handlers.get(type)!.add(fn)
    },
    off: (type: string, fn: Handler) => {
      handlers.get(type)?.delete(fn)
    },
  }
  const fire = (type: string) => {
    for (const fn of [...(handlers.get(type) ?? [])]) fn()
  }
  const listeners = () => [...handlers.values()].reduce((n, set) => n + set.size, 0)
  return { map: map as unknown as MapboxMapType, state, fire, listeners }
}

const flushMicrotasks = () => new Promise<void>((resolve) => queueMicrotask(resolve))

describe("whenStyleReady", () => {
  it("corre enseguida si el estilo ya está listo", () => {
    const { map, listeners } = fakeMap(true)
    const run = jest.fn()
    whenStyleReady(map, run)
    expect(run).toHaveBeenCalledTimes(1)
    expect(listeners()).toBe(0)
  })

  it("con styledata no corre dentro del cuadro de Mapbox, sino justo después", async () => {
    const { map, state, fire, listeners } = fakeMap(false)
    const run = jest.fn()
    whenStyleReady(map, run)

    fire("styledata")
    expect(run).not.toHaveBeenCalled()

    state.styleLoaded = true
    fire("styledata")
    // Mapbox sigue en su cuadro: todavía no.
    expect(run).not.toHaveBeenCalled()
    expect(listeners()).toBe(0)

    await flushMicrotasks()
    expect(run).toHaveBeenCalledTimes(1)

    fire("idle")
    await flushMicrotasks()
    expect(run).toHaveBeenCalledTimes(1)
  })

  it("cancelar antes del microtask evita que corra", async () => {
    const { map, state, fire } = fakeMap(false)
    const run = jest.fn()
    const cancel = whenStyleReady(map, run)
    state.styleLoaded = true
    fire("load")
    cancel()
    await flushMicrotasks()
    expect(run).not.toHaveBeenCalled()
  })

  it("cancelar mientras espera saca los listeners", () => {
    const { map, listeners } = fakeMap(false)
    const cancel = whenStyleReady(map, jest.fn())
    expect(listeners()).toBe(3)
    cancel()
    expect(listeners()).toBe(0)
  })
})
