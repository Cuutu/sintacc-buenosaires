import fs from "fs"
import path from "path"

describe("mapa público WebGL", () => {
  it("usa GeoJSON source con cluster (supercluster de Mapbox)", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/map-webgl-layers.ts"),
      "utf8"
    )
    expect(src).toContain('clusterMaxZoom: CLUSTER_MAX_ZOOM')
    expect(src).toContain("celimap-pin-fallback")
    expect(src).toContain('type: "symbol"')
    expect(src).toContain('type: "circle"')
    expect(src).toContain("pinImageId")
    expect(src).toContain("SELECTED_SOURCE")
    expect(src).toContain("getCeliMapPinStyleImage")
    expect(fs.existsSync(path.join(process.cwd(), "public/map/pin-dedicated.png"))).toBe(true)
    expect(fs.existsSync(path.join(process.cwd(), "public/map/pin-options.png"))).toBe(true)
    expect(src).toContain("PIN_POPUP_OFFSET")
    expect(src).toContain("PIN_ICON_SIZE = 0.58")
    expect(src).toContain("PIN_STROKE_COLOR")
    expect(src).toContain("FALLBACK_PIN_RADIUS")
    expect(src).toContain("PIN_FILL_OPACITY")
    expect(src).toContain("playVisiblePinEntrance")
    expect(src).toContain("STAGGER_PIN_MS")
    expect(src).toContain("promoteId")
    expect(src).toContain("LAYER_CLUSTER_HALO")
    expect(src).toContain("CLUSTER_HALO_OPACITY")
    expect(src).toContain("stackClusterLayers")
    expect(src).toContain("moveLayer")
    expect(src).toContain("LAYER_CLUSTER_SHADOW")
    expect(src).toContain('["!=", ["get", "id"], selectedId]')
    expect(src).toContain('"circle-stroke-opacity": PIN_FILL_OPACITY')
    expect(src).toContain("setCircleFill")
    expect(src).toContain("return 1")
    expect(src).toContain('map.setPaintProperty(LAYER_PINS, "icon-halo-width", 0)')
    expect(src).not.toContain("icon-halo-width\": 1.1")
    expect(src).not.toContain("return reduceMotion ? 1 : 0")
    expect(src).not.toMatch(/"circle-opacity": opacityExpr/)
  })

  it("MapboxMap público no crea Marker HTML para pins", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapboxMap.tsx"),
      "utf8"
    )
    expect(src).toContain("ensurePlacesLayers")
    expect(src).toContain("setPlacesSourceData")
    expect(src).toContain("setSelectedPlaceOnMap")
    expect(src).toContain("if (!useNumberedMarkers)")
    expect(src).toContain("new mapboxgl.Marker")
    expect(src).toContain("mapbox://styles/cuutu/cmtnrjtlq003a01qmclt69831")
    expect(src).not.toContain("mapbox://styles/mapbox/light-v11")
    expect(src).not.toContain("softenLightMap")
    expect(src).toContain("pinsReadyRef")
    expect(src).toContain("ensurePlacesLayers(instance, reduceMotion, pinsReadyRef.current)")
  })
})
