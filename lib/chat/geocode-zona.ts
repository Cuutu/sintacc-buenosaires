import { forwardGeocode } from "@/lib/mapboxGeocode"

export async function geocodeChatZona(
  zona: string
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = zona.trim()
  if (!trimmed) return null
  const query = /argentina/i.test(trimmed) ? trimmed : `${trimmed}, Argentina`
  try {
    const hits = await forwardGeocode(query, { country: "ar", limit: 1 })
    const hit = hits[0]
    if (hit == null || !Number.isFinite(hit.lat) || !Number.isFinite(hit.lng)) return null
    return { lat: hit.lat, lng: hit.lng }
  } catch {
    return null
  }
}
