import {
  __resetMapboxLifecycleStatsForTests,
  __setMapboxLifecycleDevTrackingForTests,
  getMapboxLifecycleStats,
  mapboxLifecycleTrackDestroy,
  mapboxLifecycleTrackInit,
} from "@/lib/mapbox-lifecycle"

describe("mapbox-lifecycle", () => {
  beforeEach(() => {
    __resetMapboxLifecycleStatsForTests()
  })

  afterEach(() => {
    __resetMapboxLifecycleStatsForTests()
  })

  it("tracks max one active instance through init/destroy pairs", () => {
    __setMapboxLifecycleDevTrackingForTests(true)
    mapboxLifecycleTrackInit()
    expect(getMapboxLifecycleStats().active).toBe(1)
    expect(getMapboxLifecycleStats().peakActive).toBe(1)
    mapboxLifecycleTrackDestroy()
    expect(getMapboxLifecycleStats().active).toBe(0)

    mapboxLifecycleTrackInit()
    mapboxLifecycleTrackDestroy()
    mapboxLifecycleTrackInit()
    expect(getMapboxLifecycleStats().active).toBe(1)
    expect(getMapboxLifecycleStats().peakActive).toBe(1)
    expect(getMapboxLifecycleStats().inits).toBe(3)
    expect(getMapboxLifecycleStats().destroys).toBe(2)
  })

  it("destroy is safe when active already 0", () => {
    __setMapboxLifecycleDevTrackingForTests(true)
    mapboxLifecycleTrackDestroy()
    expect(getMapboxLifecycleStats().active).toBe(0)
  })

  it("is no-op when tracking disabled (prod-like)", () => {
    __setMapboxLifecycleDevTrackingForTests(false)
    mapboxLifecycleTrackInit()
    mapboxLifecycleTrackDestroy()
    expect(getMapboxLifecycleStats()).toEqual({
      inits: 0,
      destroys: 0,
      active: 0,
      peakActive: 0,
    })
  })
})
