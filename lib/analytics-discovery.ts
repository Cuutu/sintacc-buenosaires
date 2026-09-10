import { trackEvent } from "@/lib/analytics"

/**
 * Useful Discovery: Core product metric for measuring value delivery.
 * Emitted when in the same session the user demonstrates:
 * 1. Intent (search_performed | map_filter | list_open)
 * 2. Qualified dwell (place_dwell_qualified for placeId X)
 * 3. Core commitment (favorite_add | place_share | directions_clicked on same placeId X)
 *
 * Deduplicated: at most one useful_discovery per (session, placeId).
 */

type IntentType = "search_performed" | "map_filter" | "list_open"
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

let sessionState: SessionState = {
  hasIntent: false,
  intentType: null,
  dwelledPlaces: new Map(),
  emittedDiscoveries: new Set(),
}

/**
 * Record an intent signal. Call when user performs search, filters map, or opens a list.
 */
export function recordIntentSignal(
  intentType: IntentType,
  _properties?: Record<string, string | number | boolean>
): void {
  if (!sessionState.hasIntent) {
    sessionState.hasIntent = true
    sessionState.intentType = intentType
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
  if (sessionState.dwelledPlaces.has(placeId)) return

  sessionState.dwelledPlaces.set(placeId, {
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
  if (sessionState.emittedDiscoveries.has(placeId)) return
  if (!sessionState.hasIntent) return

  const dwellData = sessionState.dwelledPlaces.get(placeId)
  if (!dwellData) return

  if (!commitmentType) return

  sessionState.emittedDiscoveries.add(placeId)

  trackEvent("useful_discovery", {
    placeId,
    commitmentType,
    intentType: sessionState.intentType || "unknown",
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
  return sessionState
}

/**
 * Reset session state for testing.
 * @internal
 */
export function __resetDiscoveryForTests(): void {
  sessionState = {
    hasIntent: false,
    intentType: null,
    dwelledPlaces: new Map(),
    emittedDiscoveries: new Set(),
  }
}
