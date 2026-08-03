/**
 * @jest-environment jsdom
 */
import {
  createCountingMapboxStub,
  createMapInstanceTeardown,
} from "@/lib/mapbox-teardown"

describe("mapbox teardown ownership", () => {
  it("unmount order (control cleanup → map destroy): control remove=1 map remove=1", async () => {
    const { map, stats } = createCountingMapboxStub()
    const teardown = createMapInstanceTeardown()
    teardown.bind(map)

    const control = {
      onRemove() {
        /* Mapbox sets _map=undefined after first onRemove */
      },
    }
    map.addControl(control)

    // React: geolocate effect cleanup corre antes que el del mapa
    teardown.releaseControl(control, map)
    teardown.destroy()

    await new Promise<void>((r) => queueMicrotask(r))
    await new Promise<void>((r) => queueMicrotask(r))

    expect(stats.controlAdd).toBe(1)
    expect(stats.controlRemove).toBe(1)
    expect(stats.mapRemove).toBe(1)
  })

  it("doble removeControl (código viejo) lanza this._map.off", () => {
    const { map } = createCountingMapboxStub()
    const control = { onRemove() {} }
    map.addControl(control)
    map.removeControl(control)
    expect(() => map.removeControl(control)).toThrow(
      /undefined is not an object \(evaluating 'this\._map\.off'\)/
    )
  })

  it("destroy idempotente + releaseControl post-destroy no-op", async () => {
    const { map, stats } = createCountingMapboxStub()
    const teardown = createMapInstanceTeardown()
    teardown.bind(map)
    const control = { onRemove() {} }
    map.addControl(control)

    teardown.destroy()
    teardown.destroy()
    teardown.releaseControl(control, map)
    await new Promise<void>((r) => queueMicrotask(r))

    expect(stats.mapRemove).toBe(1)
    expect(stats.controlRemove).toBe(1)
  })

  it("Strict Mode: mount→destroy→mount→destroy sin doble remove", async () => {
    const totals = { controlAdd: 0, controlRemove: 0, mapRemove: 0 }

    for (let i = 0; i < 2; i++) {
      const { map, stats } = createCountingMapboxStub()
      const teardown = createMapInstanceTeardown()
      teardown.bind(map)
      const control = { onRemove() {} }
      map.addControl(control)
      teardown.releaseControl(control, map)
      teardown.destroy()
      await new Promise<void>((r) => queueMicrotask(r))
      totals.controlAdd += stats.controlAdd
      totals.controlRemove += stats.controlRemove
      totals.mapRemove += stats.mapRemove
    }

    expect(totals).toEqual({ controlAdd: 2, controlRemove: 2, mapRemove: 2 })
  })

  it("toggle control sin destroy: removeControl diferido una vez", async () => {
    const { map, stats } = createCountingMapboxStub()
    const teardown = createMapInstanceTeardown()
    teardown.bind(map)
    const control = { onRemove() {} }
    map.addControl(control)

    teardown.releaseControl(control, map)
    await new Promise<void>((r) => queueMicrotask(r))

    expect(stats.mapRemove).toBe(0)
    expect(stats.controlRemove).toBe(1)
    expect(teardown.getMap()).toBe(map)
  })
})
