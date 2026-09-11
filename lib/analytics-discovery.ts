import { trackEvent } from "@/lib/analytics"

/**
 * Useful Discovery: Core product metric for measuring value delivery.
 * Emitted when in the same session the user demonstrates:
 * 1. Intent (search_performed | map_filter)
 * 2. Qualified dwell (place_dwell_qualified for placeId X)
 * 3. Core commitment (favorite_add | place_share | directions_clicked on same placeId X)
 *
 * Deduplicated: at most one useful_discovery per (session, placeId).
 * Note: list_open is tracked as a product event but does NOT count as Useful Discovery intent.
 */

type IntentType = "search_performed" | "map_filter"
type CommitmentType = "favorite_add" | "place_share" | "directions_clicked"

type SessionState = {
  /** Has user shown any intent signal in this session? */
  hasIntent: boolean
  /** First intent type detected */
  intentType: IntentType | null
  /** PlaceIds with qualified dwell */
  dwelledPlaces: Map<
    string,
    {
      dwellMs: number
      dwellThresholdMs: number
      placeContext: Record<string, string | number | boolean>
    }
  >
  /** PlaceIds where useful_discovery was already emitted */
  emittedDiscoveries: Set<string>
}

/**
 * Singleton session state stored on globalThis.
 * Ensures all module copies (across client chunks) share the same state.
 * P0 FIX: Module duplication in layout + page chunks was causing separate buffers.
 */
declare global {
  var __celimapDiscovery: SessionState | undefined
}

function getSessionState(): SessionState {
  if (typeof globalThis === "undefined") {
    // Fallback for environments without globalThis (should not happen in modern JS)
    return createFreshSessionState()
  }

  if (!globalThis.__celimapDiscovery) {
    globalThis.__celimapDiscovery = createFreshSessionState()
  }

  return globalThis.__celimapDiscovery
}

function createFreshSessionState(): SessionState {
  return {
    hasIntent: false,
    intentType: null,
    dwelledPlaces: new Map(),
    emittedDiscoveries: new Set(),
  }
}

/**
 * Record an intent signal. Call when user performs search, filters map, or opens a list.
 */
export function recordIntentSignal(
  intentType: IntentType,
  _properties?: Record<string, string | number | boolean>
): void {
  const state = getSessionState()
  if (!state.hasIntent) {
    state.hasIntent = true
    state.intentType = intentType
  }
}

/**
 * Record a qualified dwell event. Call when place_dwell_qualified is emitted.
 */
export function recordQualifiedDwell(
  placeId: string,
  dwellMs: number,
  dwellThresholdMs: number,
  placeContext: Record<string, string | number | boolean>
): void {
  const state = getSessionState()
  if (state.dwelledPlaces.has(placeId)) return

  state.dwelledPlaces.set(placeId, {
    dwellMs,
    dwellThresholdMs,
    placeContext,
  })

  checkUsefulDiscovery(placeId)
}

/**
 * Record a commitment action. Call when user favorites, shares, or gets directions.
 */
export function recordCommitment(
  commitmentType: CommitmentType,
  placeId: string | undefined
): void {
  if (!placeId) return
  checkUsefulDiscovery(placeId, commitmentType)
}

function checkUsefulDiscovery(placeId: string, commitmentType?: CommitmentType): void {
  const state = getSessionState()
  if (state.emittedDiscoveries.has(placeId)) return
  if (!state.hasIntent) return

  const dwellData = state.dwelledPlaces.get(placeId)
  if (!dwellData) return

  if (!commitmentType) return

  state.emittedDiscoveries.add(placeId)

  trackEvent("useful_discovery", {
    placeId,
    commitmentType,
    intentType: state.intentType || "unknown",
    dwellMs: dwellData.dwellMs,
    dwellThresholdMs: dwellData.dwellThresholdMs,
    ...dwellData.placeContext,
  })
}

/**
 * Get session state for testing/debugging.
 * @internal
 */
export function __getDiscoverySessionState(): SessionState {
  return getSessionState()
}

/**
 * Reset discovery state on session boundary.
 * Called when session_start fires (30 min inactivity rollover).
 */
export function resetDiscoverySession(): void {
  if (typeof globalThis !== "undefined") {
    globalThis.__celimapDiscovery = createFreshSessionState()
  }
}

/**
 * Reset session state for testing.
 * @internal
 */
export function __resetDiscoveryForTests(): void {
  resetDiscoverySession()
}
