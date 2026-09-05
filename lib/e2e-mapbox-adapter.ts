/**
 * Adapter Mapbox SOLO para E2E hermético.
 * No es WebGL real — canvas marcado data-e2e-mapbox-adapter="mock".
 */
import type { Map as MapboxMapType } from "mapbox-gl"

type Listener = (...args: unknown[]) => void

class E2eMockBounds {
  getWest() {
    return -58.5
  }
  getSouth() {
    return -34.7
  }
  getEast() {
    return -58.3
  }
  getNorth() {
    return -34.5
  }
  toArray(): [[number, number], [number, number]] {
    return [
      [this.getWest(), this.getSouth()],
      [this.getEast(), this.getNorth()],
    ]
  }
  contains(lngLat: [number, number] | { lng: number; lat: number }): boolean {
    const lng = Array.isArray(lngLat) ? lngLat[0] : lngLat.lng
    const lat = Array.isArray(lngLat) ? lngLat[1] : lngLat.lat
    return (
      lng >= this.getWest() &&
      lng <= this.getEast() &&
      lat >= this.getSouth() &&
      lat <= this.getNorth()
    )
  }
}

/**
 * Stub mínimo de mapboxgl.Map para lifecycle + efectos sin tiles/WebGL.
 */
export function createE2eMockMapboxMap(container: HTMLElement): MapboxMapType {
  const listeners = new Map<string, Set<Listener>>()
  const canvas = document.createElement("canvas")
  canvas.className = "mapboxgl-canvas"
  canvas.width = Math.max(container.clientWidth || 300, 1)
  canvas.height = Math.max(container.clientHeight || 300, 1)
  canvas.setAttribute("data-e2e-mapbox-adapter", "mock")
  canvas.style.width = "100%"
  canvas.style.height = "100%"
  container.replaceChildren(canvas)

  const emit = (event: string) => {
    const set = listeners.get(event)
    if (!set) return
    for (const cb of set) {
      try {
        cb()
      } catch {
        /* ignore */
      }
    }
  }

  const api = {
    remove() {
      canvas.remove()
      listeners.clear()
    },
    on(event: string, cb: Listener) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event)!.add(cb)
      if (event === "load") queueMicrotask(() => emit("load"))
      return api
    },
    once(event: string, cb: Listener) {
      const wrap: Listener = (...args) => {
        api.off(event, wrap)
        cb(...args)
      }
      return api.on(event, wrap)
    },
    off(event: string, cb: Listener) {
      listeners.get(event)?.delete(cb)
      return api
    },
    getZoom() {
      return 12
    },
    getCenter() {
      return { lng: -58.425, lat: -34.5875 }
    },
    getBounds() {
      return new E2eMockBounds()
    },
    project() {
      return { x: 100, y: 100 }
    },
    unproject() {
      return { lng: -58.425, lat: -34.5875 }
    },
    flyTo() {
      queueMicrotask(() => emit("moveend"))
    },
    easeTo() {
      queueMicrotask(() => emit("moveend"))
    },
    stop() {},
    jumpTo() {},
    setCenter() {},
    setZoom() {},
    fitBounds() {
      queueMicrotask(() => emit("moveend"))
    },
    resize() {},
    addControl() {},
    removeControl() {},
    getContainer() {
      return container
    },
    getCanvas() {
      return canvas
    },
    loaded() {
      return true
    },
    isStyleLoaded() {
      return true
    },
    triggerRepaint() {},
    getStyle() {
      return { layers: [] as { id: string; type: string }[] }
    },
    addSource() {
      return api
    },
    getSource() {
      return {
        setData() {},
        getClusterExpansionZoom(_id: number, cb: (err: Error | null, zoom: number) => void) {
          cb(null, 14)
        },
      }
    },
    addLayer() {
      return api
    },
    getLayer() {
      return { id: "mock" }
    },
    removeLayer() {},
    removeSource() {},
    hasImage() {
      return true
    },
    addImage() {},
    loadImage(_url: string, cb: (err: Error | null, img?: unknown) => void) {
      cb(null, {})
    },
    setFeatureState() {},
    removeFeatureState() {},
    queryRenderedFeatures() {
      return []
    },
    setPaintProperty() {},
    setLayoutProperty() {},
  }

  queueMicrotask(() => {
    emit("load")
    emit("idle")
  })

  return api as unknown as MapboxMapType
}

export function isE2eMapboxMockEnabled(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean((window as Window & { __CELIMAP_E2E_MOCK_MAPBOX__?: boolean }).__CELIMAP_E2E_MOCK_MAPBOX__)
  )
}

export function isE2eMapboxForceInitError(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(
      (window as Window & { __CELIMAP_E2E_FORCE_MAP_INIT_ERROR__?: boolean })
        .__CELIMAP_E2E_FORCE_MAP_INIT_ERROR__
    )
  )
}

export function isE2eMapboxStatsEnabled(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(
      (window as Window & { __CELIMAP_E2E_MAPBOX_STATS__?: boolean }).__CELIMAP_E2E_MAPBOX_STATS__
    )
  )
}
