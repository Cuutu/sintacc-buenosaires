import {
  recordIntentSignal,
  recordQualifiedDwell,
  recordCommitment,
  resetDiscoverySession,
  __getDiscoverySessionState,
  __resetDiscoveryForTests,
} from "@/lib/analytics-discovery"
import { trackEvent } from "@/lib/analytics"

jest.mock("@vercel/analytics", () => ({
  track: jest.fn(),
}))

jest.mock("@/lib/analytics")

describe("analytics-discovery singleton", () => {
  const mockTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>

  beforeEach(() => {
    mockTrackEvent.mockClear()
    __resetDiscoveryForTests()
  })

  afterEach(() => {
    __resetDiscoveryForTests()
  })

  describe("happy path: Intent → Dwell → Commitment → useful_discovery", () => {
    it("emite useful_discovery cuando se cumple secuencia completa", () => {
      const placeId = "place-123"
      const placeContext = { name: "Test Café", city: "CABA" }

      recordIntentSignal("search_performed")
      recordQualifiedDwell(placeId, 8500, 8000, placeContext)
      recordCommitment("place_share", placeId)

      expect(mockTrackEvent).toHaveBeenCalledWith("useful_discovery", {
        placeId,
        commitmentType: "place_share",
        intentType: "search_performed",
        dwellMs: 8500,
        dwellThresholdMs: 8000,
        name: "Test Café",
        city: "CABA",
      })
    })

    it("soporta map_filter como intent", () => {
      const placeId = "place-456"

      recordIntentSignal("map_filter")
      recordQualifiedDwell(placeId, 9000, 8000, {})
      recordCommitment("favorite_add", placeId)

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "useful_discovery",
        expect.objectContaining({
          placeId,
          commitmentType: "favorite_add",
          intentType: "map_filter",
        })
      )
    })

    it("soporta directions_clicked como commitment", () => {
      const placeId = "place-789"

      recordIntentSignal("search_performed")
      recordQualifiedDwell(placeId, 8100, 8000, {})
      recordCommitment("directions_clicked", placeId)

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "useful_discovery",
        expect.objectContaining({
          placeId,
          commitmentType: "directions_clicked",
        })
      )
    })
  })

  describe("C5: commitment antes de dwell → NO emite useful_discovery", () => {
    it("no emite UD si commitment llega antes de dwell", () => {
      const placeId = "place-early"

      recordIntentSignal("search_performed")
      recordCommitment("place_share", placeId)
      recordQualifiedDwell(placeId, 8200, 8000, {})

      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        "useful_discovery",
        expect.anything()
      )
    })

    it("no emite UD si no hay dwell y solo commitment", () => {
      const placeId = "place-no-dwell"

      recordIntentSignal("search_performed")
      recordCommitment("place_share", placeId)

      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        "useful_discovery",
        expect.anything()
      )
    })
  })

  describe("requisitos individuales faltantes", () => {
    it("no emite UD sin intent", () => {
      const placeId = "place-no-intent"

      recordQualifiedDwell(placeId, 8300, 8000, {})
      recordCommitment("place_share", placeId)

      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        "useful_discovery",
        expect.anything()
      )
    })

    it("no emite UD sin commitment", () => {
      const placeId = "place-no-commit"

      recordIntentSignal("search_performed")
      recordQualifiedDwell(placeId, 8400, 8000, {})

      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        "useful_discovery",
        expect.anything()
      )
    })

    it("no emite UD si commitment tiene placeId undefined", () => {
      recordIntentSignal("search_performed")
      recordQualifiedDwell("place-valid", 8500, 8000, {})
      recordCommitment("place_share", undefined)

      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        "useful_discovery",
        expect.anything()
      )
    })
  })

  describe("deduplicación: máximo 1 UD por (session, placeId)", () => {
    it("emite UD solo una vez para el mismo placeId", () => {
      const placeId = "place-dedupe"

      recordIntentSignal("search_performed")
      recordQualifiedDwell(placeId, 8600, 8000, {})
      recordCommitment("place_share", placeId)
      recordCommitment("favorite_add", placeId)
      recordCommitment("directions_clicked", placeId)

      expect(mockTrackEvent).toHaveBeenCalledTimes(1)
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "useful_discovery",
        expect.objectContaining({
          placeId,
          commitmentType: "place_share",
        })
      )
    })

    it("emite UD para placeIds diferentes", () => {
      const placeId1 = "place-one"
      const placeId2 = "place-two"

      recordIntentSignal("search_performed")
      recordQualifiedDwell(placeId1, 8700, 8000, {})
      recordQualifiedDwell(placeId2, 8800, 8000, {})
      recordCommitment("place_share", placeId1)
      recordCommitment("place_share", placeId2)

      expect(mockTrackEvent).toHaveBeenCalledTimes(2)
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "useful_discovery",
        expect.objectContaining({ placeId: placeId1 })
      )
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "useful_discovery",
        expect.objectContaining({ placeId: placeId2 })
      )
    })

    it("no emite UD duplicado si dwell se llama múltiples veces para mismo place", () => {
      const placeId = "place-multi-dwell"

      recordIntentSignal("search_performed")
      recordQualifiedDwell(placeId, 8900, 8000, {})
      recordQualifiedDwell(placeId, 9000, 8000, {})
      recordCommitment("place_share", placeId)

      expect(mockTrackEvent).toHaveBeenCalledTimes(1)
    })
  })

  describe("session reset: resetDiscoverySession / session_start", () => {
    it("resetea estado y permite nuevo UD para mismo placeId en nueva sesión", () => {
      const placeId = "place-reset"

      recordIntentSignal("search_performed")
      recordQualifiedDwell(placeId, 9100, 8000, {})
      recordCommitment("place_share", placeId)

      expect(mockTrackEvent).toHaveBeenCalledTimes(1)
      mockTrackEvent.mockClear()

      resetDiscoverySession()

      recordIntentSignal("map_filter")
      recordQualifiedDwell(placeId, 9200, 8000, {})
      recordCommitment("favorite_add", placeId)

      expect(mockTrackEvent).toHaveBeenCalledTimes(1)
      expect(mockTrackEvent).toHaveBeenCalledWith(
        "useful_discovery",
        expect.objectContaining({
          placeId,
          commitmentType: "favorite_add",
          intentType: "map_filter",
        })
      )
    })

    it("estado interno resetea completamente", () => {
      recordIntentSignal("search_performed")
      recordQualifiedDwell("place-1", 9300, 8000, {})

      const stateBefore = __getDiscoverySessionState()
      expect(stateBefore.hasIntent).toBe(true)
      expect(stateBefore.dwelledPlaces.size).toBe(1)

      resetDiscoverySession()

      const stateAfter = __getDiscoverySessionState()
      expect(stateAfter.hasIntent).toBe(false)
      expect(stateAfter.intentType).toBeNull()
      expect(stateAfter.dwelledPlaces.size).toBe(0)
      expect(stateAfter.emittedDiscoveries.size).toBe(0)
    })

    it("30 min rollover simulado: session_start → reset discovery", () => {
      const placeId = "place-rollover"

      recordIntentSignal("search_performed")
      recordQualifiedDwell(placeId, 9400, 8000, {})
      recordCommitment("place_share", placeId)

      expect(mockTrackEvent).toHaveBeenCalledTimes(1)
      mockTrackEvent.mockClear()

      resetDiscoverySession()

      recordCommitment("favorite_add", placeId)

      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        "useful_discovery",
        expect.anything()
      )
    })
  })

  describe("singleton garantizado: estado compartido entre copias del módulo", () => {
    it("globalThis.__celimapDiscovery persiste entre múltiples llamadas getSessionState", () => {
      const state1 = __getDiscoverySessionState()
      const state2 = __getDiscoverySessionState()

      expect(state1).toBe(state2)
    })

    it("cambios en estado son visibles inmediatamente en todas las referencias", () => {
      const stateRef1 = __getDiscoverySessionState()

      recordIntentSignal("search_performed")

      const stateRef2 = __getDiscoverySessionState()

      expect(stateRef1.hasIntent).toBe(true)
      expect(stateRef2.hasIntent).toBe(true)
      expect(stateRef1).toBe(stateRef2)
    })

    it("globalThis.__celimapDiscovery existe y es accesible", () => {
      const state = __getDiscoverySessionState()

      expect(typeof globalThis.__celimapDiscovery).toBe("object")
      expect(globalThis.__celimapDiscovery).toBeDefined()
      expect(globalThis.__celimapDiscovery).toBe(state)
    })

    it("reset crea nuevo objeto singleton y todas las llamadas nuevas lo usan", () => {
      recordIntentSignal("search_performed")
      const stateBeforeReset = __getDiscoverySessionState()

      expect(stateBeforeReset.hasIntent).toBe(true)

      resetDiscoverySession()

      const stateAfterReset = __getDiscoverySessionState()

      expect(stateAfterReset.hasIntent).toBe(false)
      expect(stateBeforeReset).not.toBe(stateAfterReset)
      expect(globalThis.__celimapDiscovery).toBe(stateAfterReset)
    })
  })

  describe("edge cases", () => {
    it("primer intent gana: segundo intent no cambia intentType", () => {
      recordIntentSignal("search_performed")
      recordIntentSignal("map_filter")

      const state = __getDiscoverySessionState()
      expect(state.intentType).toBe("search_performed")
    })

    it("context properties se pasan correctamente a useful_discovery", () => {
      const placeId = "place-context"
      const context = {
        name: "Pizzería Don Juan",
        city: "Buenos Aires",
        neighborhood: "Palermo",
        hasOutdoorSeating: true,
        rating: 4.5,
      }

      recordIntentSignal("search_performed")
      recordQualifiedDwell(placeId, 10000, 8000, context)
      recordCommitment("place_share", placeId)

      expect(mockTrackEvent).toHaveBeenCalledWith(
        "useful_discovery",
        expect.objectContaining({
          placeId,
          name: "Pizzería Don Juan",
          city: "Buenos Aires",
          neighborhood: "Palermo",
          hasOutdoorSeating: true,
          rating: 4.5,
        })
      )
    })
  })
})
