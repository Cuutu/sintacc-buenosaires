import { trackEvent } from "@/lib/analytics"
import { recordQualifiedDwell } from "@/lib/analytics-discovery"

/**
 * Threshold for qualified dwell: ≥8000ms of visible time on the same place page.
 * ASSUMPTION (not product truth): This threshold is not validated with users yet.
 */
export const PLACE_DWELL_THRESHOLD_MS = 8000

type DwellState = {
  placeId: string
  accumulatedMs: number
  lastVisibleStart: number | null
  emitted: boolean
}

const sessionDwells = new Map<string, DwellState>()

/**
 * Start or resume dwell tracking for a place page.
 * Call when the place page mounts or becomes visible.
 */
export function startPlaceDwell(
  placeId: string,
  properties: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return
  if (document.visibilityState !== "visible") return

  let state = sessionDwells.get(placeId)
  if (!state) {
    state = {
      placeId,
      accumulatedMs: 0,
      lastVisibleStart: Date.now(),
      emitted: false,
    }
    sessionDwells.set(placeId, state)
  } else if (!state.emitted && state.lastVisibleStart === null) {
    state.lastVisibleStart = Date.now()
  }

  // Store properties for later emission
  ;(state as any).properties = properties
}

/**
 * Pause dwell tracking when page becomes hidden or user navigates away.
 * Call on visibility change to 'hidden' or on unmount.
 */
export function pausePlaceDwell(placeId: string): void {
  const state = sessionDwells.get(placeId)
  if (!state || state.emitted || state.lastVisibleStart === null) return

  const now = Date.now()
  state.accumulatedMs += now - state.lastVisibleStart
  state.lastVisibleStart = null

  if (state.accumulatedMs >= PLACE_DWELL_THRESHOLD_MS) {
    emitQualifiedDwell(state)
  }
}

/**
 * Resume dwell tracking when page becomes visible again.
 */
export function resumePlaceDwell(placeId: string): void {
  const state = sessionDwells.get(placeId)
  if (!state || state.emitted || state.lastVisibleStart !== null) return
  if (document.visibilityState !== "visible") return

  state.lastVisibleStart = Date.now()
}

/**
 * Cancel dwell tracking when navigating to a different place or page.
 */
export function cancelPlaceDwell(placeId: string): void {
  sessionDwells.delete(placeId)
}

/**
 * Check if accumulated dwell has reached threshold and emit if qualified.
 * Call periodically or on key events.
 */
export function checkPlaceDwell(placeId: string): void {
  const state = sessionDwells.get(placeId)
  if (!state || state.emitted) return

  let currentMs = state.accumulatedMs
  if (state.lastVisibleStart !== null && document.visibilityState === "visible") {
    currentMs += Date.now() - state.lastVisibleStart
  }

  if (currentMs >= PLACE_DWELL_THRESHOLD_MS) {
    if (state.lastVisibleStart !== null) {
      state.accumulatedMs = currentMs
      state.lastVisibleStart = null
    }
    emitQualifiedDwell(state)
  }
}

function emitQualifiedDwell(state: DwellState): void {
  if (state.emitted) return
  state.emitted = true

  const properties = (state as any).properties || {}
  const dwellMs = state.accumulatedMs
  const dwellThresholdMs = PLACE_DWELL_THRESHOLD_MS

  trackEvent("place_dwell_qualified", {
    ...properties,
    dwellMs,
    dwellThresholdMs,
  })

  recordQualifiedDwell(state.placeId, dwellMs, dwellThresholdMs, properties)
}

/**
 * Get dwell state for testing/debugging.
 * @internal
 */
export function __getPlaceDwellState(placeId: string): DwellState | undefined {
  return sessionDwells.get(placeId)
}

/**
 * Reset all dwell state for testing.
 * @internal
 */
export function __resetPlaceDwellForTests(): void {
  sessionDwells.clear()
}
