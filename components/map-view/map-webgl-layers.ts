/**
 * Capas WebGL del mapa público.
 * Clustering = Supercluster embebido en Mapbox GL (`cluster: true` en el GeoJSON source).
 * Pins = SymbolLayer con isotipo CeliMap. Clusters = CircleLayer.
 */
import type { AnyLayer, AnySourceData, GeoJSONSource, Map as MapboxMapType, PointLike } from "mapbox-gl"
import type { IPlace } from "@/models/Place"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import {
  CELIMAP_PIN_SAFETIES,
  getCeliMapPinStyleImage,
  pinImageId,
} from "@/lib/celimap-pin"

export const PLACES_SOURCE = "celimap-places"
export const SELECTED_SOURCE = "celimap-selected"
export const LAYER_CLUSTERS = "celimap-clusters"
export const LAYER_CLUSTER_COUNT = "celimap-cluster-count"
export const LAYER_PIN_FALLBACK = "celimap-pin-fallback"
export const LAYER_PINS = "celimap-pins"
export const LAYER_SELECTED_HALO = "celimap-selected-halo"
export const LAYER_SELECTED_PIN = "celimap-selected-pin"

export const CLUSTER_MAX_ZOOM = 14
export const PIN_FOCUS_ZOOM = 16
/** Popup arriba del pin (gota ~56px). Sin esto la ficha tapa el pin. */
export const PIN_POPUP_OFFSET = 68

const SAFETY_COLOR_EXPR = [
  "match",
  ["get", "safety"],
  "dedicated_gf",
  "#1F4D35",
  "gf_options",
  "#C85A2E",
  "#CFC9BF",
] as const

const emptyCollection = (): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features: [],
})

export function placesToGeoJSON(places: IPlace[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  for (const place of places) {
    const lng = place.location?.lng
    const lat = place.location?.lat
    const id = place._id != null ? String(place._id) : ""
    if (!id || !Number.isFinite(lng) || !Number.isFinite(lat)) continue
    const safety = inferSafetyLevel(place) ?? "unknown"
    features.push({
      type: "Feature",
      id,
      geometry: { type: "Point", coordinates: [lng as number, lat as number] },
      properties: {
        id,
        safety,
        pin: pinImageId(safety),
      },
    })
  }
  return { type: "FeatureCollection", features }
}

export async function loadCeliMapPinImages(map: MapboxMapType): Promise<boolean> {
  const results = await Promise.all(
    CELIMAP_PIN_SAFETIES.map(async (safety) => {
      const id = pinImageId(safety)
      if (map.hasImage?.(id)) return true
      try {
        const image = await getCeliMapPinStyleImage(safety)
        if (map.hasImage?.(id)) return true
        map.addImage(id, image, { pixelRatio: 2 })
        return true
      } catch {
        return false
      }
    })
  )
  return results.every(Boolean)
}

function addLayerSafe(map: MapboxMapType, layer: AnyLayer): void {
  if (map.getLayer(layer.id)) return
  try {
    map.addLayer(layer)
  } catch {
    /* estilo / font mismatch */
  }
}

function addSourceSafe(
  map: MapboxMapType,
  id: string,
  source: AnySourceData
): void {
  if (map.getSource(id)) return
  map.addSource(id, source)
}

export function ensurePlacesLayers(
  map: MapboxMapType,
  reduceMotion: boolean,
  pinsReady: boolean
): void {
  addSourceSafe(map, PLACES_SOURCE, {
    type: "geojson",
    data: emptyCollection(),
    cluster: true,
    clusterRadius: 44,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
    clusterMinPoints: 2,
  })
  addSourceSafe(map, SELECTED_SOURCE, {
    type: "geojson",
    data: emptyCollection(),
  })

  const fadeMs = reduceMotion ? 0 : 280

  addLayerSafe(map, {
    id: LAYER_CLUSTERS,
    type: "circle",
    source: PLACES_SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#1F4D35",
      "circle-radius": ["step", ["get", "point_count"], 16, 12, 18, 40, 22],
      "circle-stroke-width": 2,
      "circle-stroke-color": "#F6F1E8",
      "circle-opacity": 1,
    },
  })

  addLayerSafe(map, {
    id: LAYER_CLUSTER_COUNT,
    type: "symbol",
    source: PLACES_SOURCE,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["to-string", ["get", "point_count"]],
      "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
      "text-size": 13,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#FFFFFF",
    },
  })

  addLayerSafe(map, {
    id: LAYER_PIN_FALLBACK,
    type: "circle",
    source: PLACES_SOURCE,
    filter: ["!", ["has", "point_count"]],
    layout: {
      visibility: pinsReady ? "none" : "visible",
    },
    paint: {
      "circle-color": SAFETY_COLOR_EXPR as unknown as string,
      "circle-radius": 8,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#F6F1E8",
    },
  })

  addLayerSafe(map, {
    id: LAYER_PINS,
    type: "symbol",
    source: PLACES_SOURCE,
    filter: ["!", ["has", "point_count"]],
    layout: {
      visibility: pinsReady ? "visible" : "none",
      "icon-image": ["get", "pin"],
      "icon-size": 0.58,
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-padding": 0,
    },
    paint: {
      "icon-opacity": 1,
      "icon-opacity-transition": { duration: fadeMs, delay: 0 },
    },
  })

  addLayerSafe(map, {
    id: LAYER_SELECTED_HALO,
    type: "circle",
    source: SELECTED_SOURCE,
    paint: {
      "circle-radius": ["case", ["==", ["get", "mode"], "selected"], 15, 11],
      "circle-color": SAFETY_COLOR_EXPR as unknown as string,
      "circle-opacity": 0.22,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#F6F1E8",
    },
  })

  addLayerSafe(map, {
    id: LAYER_SELECTED_PIN,
    type: "symbol",
    source: SELECTED_SOURCE,
    layout: {
      "icon-image": ["get", "pin"],
      "icon-size": ["case", ["==", ["get", "mode"], "selected"], 0.67, 0.62],
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-padding": 0,
    },
    paint: {
      "icon-opacity": 1,
    },
  })

  if (map.getLayer(LAYER_SELECTED_HALO)) {
    try {
      map.setFilter(LAYER_SELECTED_HALO, null)
      map.setPaintProperty(LAYER_SELECTED_HALO, "circle-color", SAFETY_COLOR_EXPR as unknown as string)
      map.setPaintProperty(LAYER_SELECTED_HALO, "circle-opacity", 0.22)
      map.setPaintProperty(LAYER_SELECTED_HALO, "circle-stroke-width", 2)
      map.setPaintProperty(LAYER_SELECTED_HALO, "circle-stroke-color", "#F6F1E8")
      map.setPaintProperty(LAYER_SELECTED_HALO, "circle-translate", [0, 0])
    } catch {
      /* capa vieja */
    }
  }
  if (map.getLayer(LAYER_PIN_FALLBACK)) {
    map.setLayoutProperty(LAYER_PIN_FALLBACK, "visibility", pinsReady ? "none" : "visible")
    map.setFilter(LAYER_PIN_FALLBACK, ["!", ["has", "point_count"]])
  }
  if (map.getLayer(LAYER_PINS)) {
    map.setLayoutProperty(LAYER_PINS, "visibility", pinsReady ? "visible" : "none")
    map.setFilter(LAYER_PINS, ["!", ["has", "point_count"]])
  }
}

export function setPlacesSourceData(map: MapboxMapType, places: IPlace[]): void {
  const source = map.getSource(PLACES_SOURCE) as GeoJSONSource | undefined
  source?.setData(placesToGeoJSON(places))
}

export function setSelectedPlaceOnMap(
  map: MapboxMapType,
  place: IPlace | null,
  mode: "selected" | "hovered" = "selected"
): void {
  const source = map.getSource(SELECTED_SOURCE) as GeoJSONSource | undefined
  if (!source) return
  if (!place) {
    source.setData(emptyCollection())
    return
  }
  const geo = placesToGeoJSON([place])
  if (geo.features[0]) {
    geo.features[0].properties = {
      ...geo.features[0].properties,
      mode,
    }
  }
  source.setData(geo)
}

export function expandClusterAt(
  map: MapboxMapType,
  clusterId: number,
  lngLat: [number, number],
  reduceMotion: boolean
): void {
  const source = map.getSource(PLACES_SOURCE) as GeoJSONSource & {
    getClusterExpansionZoom?: (
      id: number,
      cb: (err: Error | null, zoom: number) => void
    ) => void
  }
  const fallbackZoom = Math.min(map.getZoom() + 2, PIN_FOCUS_ZOOM)
  if (!source?.getClusterExpansionZoom) {
    map.easeTo({
      center: lngLat,
      zoom: fallbackZoom,
      duration: reduceMotion ? 0 : 500,
    })
    return
  }
  source.getClusterExpansionZoom(clusterId, (err, zoom) => {
    map.easeTo({
      center: lngLat,
      zoom: err || zoom == null ? fallbackZoom : Math.max(zoom, CLUSTER_MAX_ZOOM + 1),
      duration: reduceMotion ? 0 : 500,
    })
  })
}

export function queryPlaceOrClusterAt(
  map: MapboxMapType,
  point: PointLike
): { kind: "cluster"; clusterId: number } | { kind: "place"; id: string } | null {
  const layers = [
    LAYER_SELECTED_PIN,
    LAYER_SELECTED_HALO,
    LAYER_CLUSTERS,
    LAYER_PINS,
    LAYER_PIN_FALLBACK,
  ].filter((id) => Boolean(map.getLayer(id)))
  if (layers.length === 0) return null
  const hits = map.queryRenderedFeatures(point, { layers })
  const first = hits[0]
  if (!first) return null
  const clusterId = first.properties?.cluster_id
  if (clusterId != null) return { kind: "cluster", clusterId: Number(clusterId) }
  const id = String(first.properties?.id ?? first.id ?? "")
  if (!id) return null
  return { kind: "place", id }
}
