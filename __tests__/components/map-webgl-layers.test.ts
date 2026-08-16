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
    expect(src).not.toContain('["!=", ["get", "id"], selectedId]')
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
  })
})
