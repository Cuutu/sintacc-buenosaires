/**
 * Contadores Mapbox: development, tests unitarios, o E2E hermético
 * (`window.__CELIMAP_E2E_MAPBOX_STATS__`). Producción normal: no-ops.
 */

export type MapboxLifecycleStats = {
  inits: number
  destroys: number
  active: number
  peakActive: number
}

let inits = 0
let destroys = 0
let active = 0
let peakActive = 0
let forceDevForTests = false

function e2eStatsEnabled(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(
      (window as Window & { __CELIMAP_E2E_MAPBOX_STATS__?: boolean }).__CELIMAP_E2E_MAPBOX_STATS__
    )
  )
}

function isDev(): boolean {
  return forceDevForTests || process.env.NODE_ENV === "development" || e2eStatsEnabled()
}

export function mapboxLifecycleTrackInit(): void {
  if (!isDev()) return
  inits += 1
  active += 1
  if (active > peakActive) peakActive = active
  if (typeof window !== "undefined") {
    ;(window as Window & { __celimapMapboxStats?: MapboxLifecycleStats }).__celimapMapboxStats =
      getMapboxLifecycleStats()
  }
}

export function mapboxLifecycleTrackDestroy(): void {
  if (!isDev()) return
  destroys += 1
  active = Math.max(0, active - 1)
  if (typeof window !== "undefined") {
    ;(window as Window & { __celimapMapboxStats?: MapboxLifecycleStats }).__celimapMapboxStats =
      getMapboxLifecycleStats()
  }
}

export function getMapboxLifecycleStats(): MapboxLifecycleStats {
  return { inits, destroys, active, peakActive }
}

/** Solo tests. */
export function __resetMapboxLifecycleStatsForTests() {
  inits = 0
  destroys = 0
  active = 0
  peakActive = 0
  forceDevForTests = false
}

/** Solo tests: simula development tracking. */
export function __setMapboxLifecycleDevTrackingForTests(enabled: boolean) {
  forceDevForTests = enabled
}
