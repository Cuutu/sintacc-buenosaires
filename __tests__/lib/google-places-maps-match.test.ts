/**
 * @jest-environment node
 */
import {
  distanceKm,
  findGooglePlaceFromMapsUrl,
  mapsMatchMaxKm,
  searchGooglePlaceNear,
} from "@/lib/google-places-enriched"
import { parseGoogleMapsUrl } from "@/lib/place-research/resolve-maps-url"

// Link real de Bonnevill (Villa Devoto) ya expandido.
const BONNEVILL_URL =
  "https://www.google.com/maps/place/Bonnevill/@-34.6057344,-58.5046558,17z/data=!4m6!3m5!1s0x95bcb700433472e5:0x90be87c92c83663!8m2!3d-34.6057344!4d-58.5046558!16s%2Fg%2F11xshjj4yj"

const SANITARIOS_BONNEVILLE = {
  id: "ChIJ-sanitarios",
  displayName: { text: "Sanitarios Bonneville" },
  formattedAddress: "Rawson 2117, Buenos Aires",
  location: { latitude: -34.4888511, longitude: -58.4965711 },
}

const BONNEVILL_DEVOTO = {
  id: "ChIJ-bonnevill",
  displayName: { text: "Bonnevill" },
  formattedAddress: "Tinogasta 3979, Villa Devoto",
  location: { latitude: -34.6056571, longitude: -58.5047231 },
}

type FetchCall = { url: string; init?: RequestInit }

function mockGoogle(searchResults: unknown[]) {
  const calls: FetchCall[] = []
  global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const href = String(url)
    calls.push({ url: href, init })
    if (href.endsWith(":searchText")) {
      return new Response(JSON.stringify({ places: searchResults }), { status: 200 })
    }
    const match = [SANITARIOS_BONNEVILLE, BONNEVILL_DEVOTO].find((p) =>
      href.includes(`/places/${encodeURIComponent(p.id)}?`)
    )
    if (match) return new Response(JSON.stringify(match), { status: 200 })
    return new Response("{}", { status: 404 })
  }) as unknown as typeof fetch
  return calls
}

describe("Google Maps link → lugar de Google", () => {
  const originalFetch = global.fetch
  const originalKey = process.env.GOOGLE_MAPS_API_KEY

  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = "test-key"
  })

  afterEach(() => {
    global.fetch = originalFetch
    if (originalKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY
    else process.env.GOOGLE_MAPS_API_KEY = originalKey
  })

  it("mide distancias en km", () => {
    const km = distanceKm(
      { lat: -34.6057344, lng: -58.5046558 },
      { lat: -34.4888511, lng: -58.4965711 }
    )
    expect(km).toBeGreaterThan(12.5)
    expect(km).toBeLessThan(13.5)
  })

  it("usa un margen chico cuando el link trae el pin exacto", () => {
    expect(mapsMatchMaxKm(parseGoogleMapsUrl(BONNEVILL_URL))).toBe(0.5)
    expect(
      mapsMatchMaxKm(parseGoogleMapsUrl("https://www.google.com/maps/place/Algo/@-34.6,-58.4,15z"))
    ).toBe(2)
  })

  it("descarta un negocio con nombre parecido lejos del pin (caso Bonnevill)", async () => {
    const calls = mockGoogle([SANITARIOS_BONNEVILLE])
    const resolved = parseGoogleMapsUrl(BONNEVILL_URL)

    const place = await findGooglePlaceFromMapsUrl(BONNEVILL_URL, resolved)

    expect(place).toBeNull()
    // No pidió detalles del corralón.
    expect(calls.some((c) => c.url.includes("ChIJ-sanitarios"))).toBe(false)
  })

  it("elige el resultado que está en el pin aunque Google lo devuelva segundo", async () => {
    mockGoogle([SANITARIOS_BONNEVILLE, BONNEVILL_DEVOTO])
    const resolved = parseGoogleMapsUrl(BONNEVILL_URL)

    const place = await findGooglePlaceFromMapsUrl(BONNEVILL_URL, resolved)

    expect(place?.placeId).toBe("ChIJ-bonnevill")
    expect(place?.lat).toBeCloseTo(-34.6056571, 5)
  })

  it("searchGooglePlaceNear pide la ubicación y respeta el máximo", async () => {
    const calls = mockGoogle([SANITARIOS_BONNEVILLE])
    const hit = await searchGooglePlaceNear(
      "Bonnevill",
      { lat: -34.6057344, lng: -58.5046558 },
      0.5
    )
    expect(hit).toBeNull()
    const headers = calls[0]?.init?.headers as Record<string, string>
    expect(headers["X-Goog-FieldMask"]).toContain("places.location")
  })
})
