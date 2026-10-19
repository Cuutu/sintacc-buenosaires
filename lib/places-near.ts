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

/**
 * En dos pasos: primero solo id y coordenadas de todo el rectángulo (documentos
 * chicos), para elegir los más cercanos; después los datos completos de esos.
 * En CABA el rectángulo trae cientos de lugares y bajar todos con fotos y
 * horarios era lo que más tardaba.
 */
export async function findPlacesNear<T extends WithLocation>(options: {
  lat: number
  lng: number
  radiusMeters: number
  /** Filtro extra (status, tipo, tags…). Se combina con el rectángulo. */
  filter: FilterQuery<IPlace>
  /** Campos del resultado. `location` se agrega siempre. */
  projection: Record<string, number>
  limit: number
  /** Cuántos lugares del rectángulo se miran como máximo. */
  maxCandidates?: number
}): Promise<(T & { distance: number })[]> {
  const { lat, lng, radiusMeters, filter, projection, limit, maxCandidates = 3000 } = options
  const box = boundingBox(lat, lng, radiusMeters)
  const points = await Place.find(
    {
      $and: [
        filter,
        {
          "location.lat": { $gte: box.minLat, $lte: box.maxLat },
          "location.lng": { $gte: box.minLng, $lte: box.maxLng },
        },
      ],
    },
    { _id: 1, "location.lat": 1, "location.lng": 1 }
  )
    .limit(maxCandidates)
    .lean<(WithLocation & { _id: unknown })[]>()

  const nearest: { id: unknown; distance: number }[] = []
  for (const doc of points) {
    const pLat = doc.location?.lat
    const pLng = doc.location?.lng
    if (typeof pLat !== "number" || typeof pLng !== "number") continue
    const distance = haversineMeters({ lat, lng }, { lat: pLat, lng: pLng })
    if (distance <= radiusMeters) nearest.push({ id: doc._id, distance })
  }
  nearest.sort((a, b) => a.distance - b.distance)
  nearest.length = Math.min(nearest.length, limit)
  if (nearest.length === 0) return []

  const docs = await Place.find({ _id: { $in: nearest.map((n) => n.id) } }, { ...projection, location: 1 })
    .limit(nearest.length)
    .lean<(T & { _id: unknown })[]>()
  const byId = new Map(docs.map((d) => [String(d._id), d]))
  const out: (T & { distance: number })[] = []
  for (const n of nearest) {
    const doc = byId.get(String(n.id))
    if (doc) out.push({ ...doc, distance: n.distance })
  }
  return out
}
