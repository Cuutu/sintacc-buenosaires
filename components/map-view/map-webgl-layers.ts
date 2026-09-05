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
  PIN_RASTER_SCALE,
  pinImageId,
} from "@/lib/celimap-pin"

export const PLACES_SOURCE = "celimap-places"
export const SELECTED_SOURCE = "celimap-selected"
export const LAYER_CLUSTER_SHADOW = "celimap-cluster-shadow"
export const LAYER_CLUSTER_HALO = "celimap-cluster-halo"
export const LAYER_CLUSTERS = "celimap-clusters"
export const LAYER_CLUSTER_COUNT = "celimap-cluster-count"
export const LAYER_PIN_FALLBACK = "celimap-pin-fallback"
export const LAYER_PINS = "celimap-pins"
export const LAYER_SELECTED_HALO = "celimap-selected-halo"
export const LAYER_SELECTED_PIN = "celimap-selected-pin"

export const CLUSTER_MAX_ZOOM = 14
export const PIN_FOCUS_ZOOM = 16
/** 0.58 * 0.75. Gota lógica 64×84 @ pixelRatio 3. */
export const PIN_ICON_SIZE = 0.435
export const PIN_SELECTED_SCALE = 1.25
export const PIN_SELECTED_SIZE = PIN_ICON_SIZE * PIN_SELECTED_SCALE
export const MARKER_TRANSITION_MS = 200
export const DIMMED_OPACITY = 0.4
export const CLUSTER_HALO_PX = 10
export const CLUSTER_HALO_OPACITY = 0.3
/** Popup arriba del pin. Sin esto la ficha tapa el pin. */
export const PIN_POPUP_OFFSET = 52

const SAFETY_COLOR_EXPR = [
  "match",
  ["get", "safety"],
  "dedicated_gf",
  "#1F4D35",
  "gf_options",
  "#C85A2E",
  "#CFC9BF",
] as const

/** 1–9 / 10–49 / 50–199 / 200+ */
const CLUSTER_RADIUS_EXPR = [
  "step",
  ["get", "point_count"],
  14,
  10,
  18,
  50,
  24,
  200,
  30,
] as const

/** Radio cluster + 10px. Step explícito: `+` anidado a veces no pinta. */
const CLUSTER_HALO_RADIUS_EXPR = [
  "step",
  ["get", "point_count"],
  24,
  10,
  28,
  50,
  34,
  200,
  40,
] as const

const emptyCollection = (): GeoJSON.FeatureCollection => ({
  type: "FeatureCollection",
  features: [],
})

type SelectionState = {
  id: string | null
  mode: "selected" | "hovered"
}

const selectionByMap = new WeakMap<MapboxMapType, SelectionState>()

function transitionMs(reduceMotion: boolean): number {
  return reduceMotion ? 0 : MARKER_TRANSITION_MS
}

function unselectedPinFilter(selectedId: string | null) {
  if (!selectedId) return ["!", ["has", "point_count"]] as const
  return [
    "all",
    ["!", ["has", "point_count"]],
    ["!=", ["get", "id"], selectedId],
  ] as const
}

function applySelectionPresentation(map: MapboxMapType, reduceMotion: boolean): void {
  const selection = selectionByMap.get(map)
  const selectedId = selection?.id ?? null
  const dim =
    selectedId && selection?.mode === "selected" ? DIMMED_OPACITY : 1
  const fade = transitionMs(reduceMotion)

  const pinFilter = unselectedPinFilter(selectedId)
  if (map.getLayer(LAYER_PINS)) {
    map.setFilter(LAYER_PINS, pinFilter)
    map.setPaintProperty(LAYER_PINS, "icon-opacity", dim)
    map.setPaintProperty(LAYER_PINS, "icon-opacity-transition", { duration: fade, delay: 0 })
  }
  if (map.getLayer(LAYER_PIN_FALLBACK)) {
    map.setFilter(LAYER_PIN_FALLBACK, pinFilter)
    map.setPaintProperty(LAYER_PIN_FALLBACK, "circle-opacity", dim)
    map.setPaintProperty(LAYER_PIN_FALLBACK, "circle-opacity-transition", {
      duration: fade,
      delay: 0,
    })
  }

  const clusterOpacity = {
    duration: fade,
    delay: 0,
  }
  if (map.getLayer(LAYER_CLUSTER_SHADOW)) {
    map.setPaintProperty(LAYER_CLUSTER_SHADOW, "circle-opacity", dim * 0.2)
    map.setPaintProperty(LAYER_CLUSTER_SHADOW, "circle-opacity-transition", clusterOpacity)
  }
  if (map.getLayer(LAYER_CLUSTER_HALO)) {
    map.setPaintProperty(LAYER_CLUSTER_HALO, "circle-opacity", dim * CLUSTER_HALO_OPACITY)
    map.setPaintProperty(LAYER_CLUSTER_HALO, "circle-opacity-transition", clusterOpacity)
  }
  if (map.getLayer(LAYER_CLUSTERS)) {
    map.setPaintProperty(LAYER_CLUSTERS, "circle-opacity", dim)
    map.setPaintProperty(LAYER_CLUSTERS, "circle-opacity-transition", clusterOpacity)
  }
  if (map.getLayer(LAYER_CLUSTER_COUNT)) {
    map.setPaintProperty(LAYER_CLUSTER_COUNT, "text-opacity", dim)
    map.setPaintProperty(LAYER_CLUSTER_COUNT, "text-opacity-transition", clusterOpacity)
  }

  if (map.getLayer(LAYER_SELECTED_PIN)) {
    map.setLayoutProperty(LAYER_SELECTED_PIN, "icon-size", [
      "case",
      ["==", ["get", "mode"], "selected"],
      PIN_SELECTED_SIZE,
      PIN_ICON_SIZE,
    ])
  }
}

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
        map.addImage(id, image, { pixelRatio: PIN_RASTER_SCALE })
        return true
      } catch {
        return false
      }
    })
  )
  return results.every(Boolean)
}

function addLayerSafe(map: MapboxMapType, layer: AnyLayer, beforeId?: string): void {
  if (map.getLayer(layer.id)) return
  try {
    if (beforeId && map.getLayer(beforeId)) {
      map.addLayer(layer, beforeId)
    } else {
      map.addLayer(layer)
    }
  } catch {
    /* estilo / font mismatch */
  }
}

function stackClusterLayers(map: MapboxMapType): void {
  if (!map.getLayer(LAYER_CLUSTERS)) return
  try {
    if (map.getLayer(LAYER_CLUSTER_HALO)) {
      map.moveLayer(LAYER_CLUSTER_HALO, LAYER_CLUSTERS)
    }
    if (map.getLayer(LAYER_CLUSTER_SHADOW) && map.getLayer(LAYER_CLUSTER_HALO)) {
      map.moveLayer(LAYER_CLUSTER_SHADOW, LAYER_CLUSTER_HALO)
    } else if (map.getLayer(LAYER_CLUSTER_SHADOW)) {
      map.moveLayer(LAYER_CLUSTER_SHADOW, LAYER_CLUSTERS)
    }
  } catch {
    /* orden no crítico */
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

  const fadeMs = transitionMs(reduceMotion)
  const sizeTransition = { duration: fadeMs, delay: 0 }

  addLayerSafe(map, {
    id: LAYER_CLUSTER_SHADOW,
    type: "circle",
    source: PLACES_SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#000000",
      "circle-radius": CLUSTER_RADIUS_EXPR as unknown as number,
      "circle-opacity": 0.2,
      "circle-blur": 0.85,
      "circle-translate": [0, 2],
      "circle-translate-anchor": "viewport",
    },
  })

  addLayerSafe(map, {
    id: LAYER_CLUSTER_HALO,
    type: "circle",
    source: PLACES_SOURCE,
    filter: ["all", ["has", "point_count"], [">=", ["get", "point_count"], 50]],
    paint: {
      "circle-color": "#1F4D35",
      "circle-radius": CLUSTER_HALO_RADIUS_EXPR as unknown as number,
      "circle-opacity": CLUSTER_HALO_OPACITY,
    },
  })

  addLayerSafe(map, {
    id: LAYER_CLUSTERS,
    type: "circle",
    source: PLACES_SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#1F4D35",
      "circle-radius": CLUSTER_RADIUS_EXPR as unknown as number,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#F6F1E8",
      "circle-opacity": 1,
      "circle-opacity-transition": { duration: fadeMs, delay: 0 },
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
      "text-size": ["step", ["get", "point_count"], 12, 10, 13, 50, 14, 200, 15],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#FFFFFF",
      "text-opacity-transition": { duration: fadeMs, delay: 0 },
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
      "circle-radius": 6,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#F6F1E8",
      "circle-opacity-transition": { duration: fadeMs, delay: 0 },
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
      "icon-size": PIN_ICON_SIZE,
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
      "circle-radius": ["case", ["==", ["get", "mode"], "selected"], 16, 10],
      "circle-color": SAFETY_COLOR_EXPR as unknown as string,
      "circle-opacity": 0.14,
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#F6F1E8",
    },
  })

  addLayerSafe(map, {
    id: LAYER_SELECTED_PIN,
    type: "symbol",
    source: SELECTED_SOURCE,
    layout: {
      "icon-image": ["get", "pin"],
      "icon-size": [
        "case",
        ["==", ["get", "mode"], "selected"],
        PIN_SELECTED_SIZE,
        PIN_ICON_SIZE,
      ],
      "icon-anchor": "bottom",
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "icon-padding": 0,
    },
    paint: {
      "icon-opacity": 1,
      // Mapbox interpola icon-size entre updates de layout si hay transition.
      ...( { "icon-size-transition": sizeTransition } as Record<string, unknown> ),
    },
  })

  if (map.getLayer(LAYER_CLUSTER_SHADOW)) {
    try {
      map.setPaintProperty(LAYER_CLUSTER_SHADOW, "circle-radius", CLUSTER_RADIUS_EXPR as unknown as number)
      map.setPaintProperty(LAYER_CLUSTER_SHADOW, "circle-blur", 0.85)
      map.setPaintProperty(LAYER_CLUSTER_SHADOW, "circle-translate", [0, 2])
    } catch {
      /* capa vieja */
    }
  }
  if (map.getLayer(LAYER_CLUSTER_HALO)) {
    try {
      map.setFilter(LAYER_CLUSTER_HALO, [
        "all",
        ["has", "point_count"],
        [">=", ["get", "point_count"], 50],
      ])
      map.setPaintProperty(
        LAYER_CLUSTER_HALO,
        "circle-radius",
        CLUSTER_HALO_RADIUS_EXPR as unknown as number
      )
      map.setPaintProperty(LAYER_CLUSTER_HALO, "circle-opacity", CLUSTER_HALO_OPACITY)
    } catch {
      /* capa vieja */
    }
  }
  if (map.getLayer(LAYER_CLUSTERS)) {
    try {
      map.setPaintProperty(LAYER_CLUSTERS, "circle-radius", CLUSTER_RADIUS_EXPR as unknown as number)
    } catch {
      /* capa vieja */
    }
  }
  if (map.getLayer(LAYER_SELECTED_HALO)) {
    try {
      map.setFilter(LAYER_SELECTED_HALO, null)
      map.setPaintProperty(LAYER_SELECTED_HALO, "circle-color", SAFETY_COLOR_EXPR as unknown as string)
      map.setPaintProperty(LAYER_SELECTED_HALO, "circle-radius", [
        "case",
        ["==", ["get", "mode"], "selected"],
        16,
        10,
      ])
      map.setPaintProperty(LAYER_SELECTED_HALO, "circle-opacity", 0.14)
      map.setPaintProperty(LAYER_SELECTED_HALO, "circle-stroke-width", 1.5)
      map.setPaintProperty(LAYER_SELECTED_HALO, "circle-stroke-color", "#F6F1E8")
      map.setPaintProperty(LAYER_SELECTED_HALO, "circle-translate", [0, 0])
    } catch {
      /* capa vieja */
    }
  }
  if (map.getLayer(LAYER_PIN_FALLBACK)) {
    map.setLayoutProperty(LAYER_PIN_FALLBACK, "visibility", pinsReady ? "none" : "visible")
  }
  if (map.getLayer(LAYER_PINS)) {
    map.setLayoutProperty(LAYER_PINS, "visibility", pinsReady ? "visible" : "none")
    map.setLayoutProperty(LAYER_PINS, "icon-size", PIN_ICON_SIZE)
  }

  stackClusterLayers(map)
  applySelectionPresentation(map, reduceMotion)
}

export function setPlacesSourceData(map: MapboxMapType, places: IPlace[]): void {
  const source = map.getSource(PLACES_SOURCE) as GeoJSONSource | undefined
  source?.setData(placesToGeoJSON(places))
}

export function setSelectedPlaceOnMap(
  map: MapboxMapType,
  place: IPlace | null,
  mode: "selected" | "hovered" = "selected",
  reduceMotion = false
): void {
  const source = map.getSource(SELECTED_SOURCE) as GeoJSONSource | undefined
  if (!source) return
  if (!place) {
    selectionByMap.set(map, { id: null, mode: "hovered" })
    source.setData(emptyCollection())
    applySelectionPresentation(map, reduceMotion)
    return
  }
  const id = place._id != null ? String(place._id) : null
  selectionByMap.set(map, { id, mode })
  const geo = placesToGeoJSON([place])
  const applyMode = (nextMode: "selected" | "hovered") => {
    if (geo.features[0]) {
      geo.features[0].properties = {
        ...geo.features[0].properties,
        mode: nextMode,
      }
    }
    source.setData(geo)
  }
  if (mode === "selected" && !reduceMotion) {
    applyMode("hovered")
    applySelectionPresentation(map, reduceMotion)
    window.requestAnimationFrame(() => {
      const current = selectionByMap.get(map)
      if (current?.id !== id || current.mode !== "selected") return
      applyMode("selected")
    })
    return
  }
  applyMode(mode)
  applySelectionPresentation(map, reduceMotion)
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
    LAYER_CLUSTER_HALO,
    LAYER_CLUSTER_SHADOW,
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
