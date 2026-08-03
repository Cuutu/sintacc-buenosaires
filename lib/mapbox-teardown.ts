/**
 * Ownership único del teardown Mapbox.
 * Regla: map.remove() es dueño de quitar controles en destroy.
 * removeControl manual solo diferido si el mapa sigue vivo (toggle props).
 */

export type MapboxTeardownMap = {
  remove: () => void
  removeControl: (control: unknown) => void
}

export type MapInstanceTeardown = {
  bind: (map: MapboxTeardownMap) => void
  getMap: () => MapboxTeardownMap | null
  isRemoved: () => boolean
  /** Effect dueño del mapa. Idempotente. */
  destroy: (opts?: { onError?: (error: unknown) => void }) => void
  /**
   * Cleanup de control hijo.
   * Nunca removeControl sync (chocaría con destroy en unmount).
   * Microtask: si destroy ya corrió → no-op; si mapa vive → remove una vez.
   */
  releaseControl: (control: unknown, map: MapboxTeardownMap) => void
}

export function createMapInstanceTeardown(): MapInstanceTeardown {
  let removed = false
  let mapRef: MapboxTeardownMap | null = null

  return {
    bind(map) {
      removed = false
      mapRef = map
    },
    getMap() {
      return mapRef
    },
    isRemoved() {
      return removed
    },
    destroy(opts) {
      const map = mapRef
      if (!map || removed) return
      // Anular ref antes de remove → bloquea reentrada y releaseControl diferido
      mapRef = null
      removed = true
      try {
        map.remove()
      } catch (error) {
        opts?.onError?.(error)
      }
    },
    releaseControl(control, map) {
      queueMicrotask(() => {
        if (removed) return
        if (mapRef !== map) return
        try {
          map.removeControl(control)
        } catch {
          /* control ya fuera / mapa parcial */
        }
      })
    },
  }
}

/**
 * Simula Mapbox: remove() llama onRemove de cada control una vez.
 * Segundo onRemove del mismo control puede lanzar (bug iOS real).
 */
export function createCountingMapboxStub(options?: {
  throwOnSecondControlRemove?: boolean
}): {
  map: MapboxTeardownMap & {
    addControl: (control: { onRemove?: (map: MapboxTeardownMap) => void }) => void
  }
  stats: { controlAdd: number; controlRemove: number; mapRemove: number }
} {
  const stats = { controlAdd: 0, controlRemove: 0, mapRemove: 0 }
  const controls: Array<{ onRemove?: (map: MapboxTeardownMap) => void; _removed?: boolean }> = []
  const throwOnSecond = options?.throwOnSecondControlRemove !== false

  const map: MapboxTeardownMap & {
    addControl: (control: { onRemove?: (map: MapboxTeardownMap) => void }) => void
  } = {
    addControl(control) {
      stats.controlAdd += 1
      controls.push(control)
    },
    removeControl(control) {
      const c = control as {
        onRemove?: (map: MapboxTeardownMap) => void
        _removed?: boolean
      }
      if (c._removed && throwOnSecond) {
        throw new TypeError("undefined is not an object (evaluating 'this._map.off')")
      }
      const idx = controls.indexOf(c)
      if (idx >= 0) controls.splice(idx, 1)
      stats.controlRemove += 1
      c._removed = true
      c.onRemove?.(map)
    },
    remove() {
      stats.mapRemove += 1
      // Copia: removeControl muta el array
      const snapshot = [...controls]
      for (const c of snapshot) {
        map.removeControl(c)
      }
    },
  }

  return { map, stats }
}
