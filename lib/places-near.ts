import type { FilterQuery } from "mongoose"
import { Place, type IPlace } from "@/models/Place"

/**
 * Lugares cerca de un punto. `location` de Place es { lat, lng } (no GeoJSON), así
 * que $geoNear con el índice 2dsphere no sirve: lo lee como [lng, lat] al revés y
 * no devuelve nada. Se busca en un rectángulo con el índice
 * { status, location.lat, location.lng } y la distancia se calcula acá.
 */

const METERS_PER_DEGREE_LAT = 111_320

export function boundingBox(lat: number, lng: number, radiusMeters: number) {
  const latPad = radiusMeters / METERS_PER_DEGREE_LAT
  const lngPad = radiusMeters / (METERS_PER_DEGREE_LAT * Math.max(0.01, Math.cos((lat * Math.PI) / 180)))
  return { minLat: lat - latPad, maxLat: lat + latPad, minLng: lng - lngPad, maxLng: lng + lngPad }
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)))
}

type WithLocation = { location?: { lat?: number; lng?: number } | null }

export async function findPlacesNear<T extends WithLocation>(options: {
  lat: number
  lng: number
  radiusMeters: number
  /** Filtro extra (status, tipo, tags…). Se combina con el rectángulo. */
  filter: FilterQuery<IPlace>
  /** Tiene que incluir `location`. */
  projection: Record<string, number>
  limit: number
  /** Cuántos lugares del rectángulo se traen como máximo antes de ordenar. */
  maxCandidates?: number
}): Promise<(T & { distance: number })[]> {
  const { lat, lng, radiusMeters, filter, projection, limit, maxCandidates = 1500 } = options
  const box = boundingBox(lat, lng, radiusMeters)
  const candidates = await Place.find(
    {
      $and: [
        filter,
        {
          "location.lat": { $gte: box.minLat, $lte: box.maxLat },
          "location.lng": { $gte: box.minLng, $lte: box.maxLng },
        },
      ],
    },
    { ...projection, location: 1 }
  )
    .limit(maxCandidates)
    .lean<T[]>()

  const near: (T & { distance: number })[] = []
  for (const doc of candidates) {
    const pLat = doc.location?.lat
    const pLng = doc.location?.lng
    if (typeof pLat !== "number" || typeof pLng !== "number") continue
    const distance = haversineMeters({ lat, lng }, { lat: pLat, lng: pLng })
    if (distance <= radiusMeters) near.push({ ...doc, distance })
  }
  near.sort((a, b) => a.distance - b.distance)
  return near.slice(0, limit)
}
