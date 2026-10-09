/**
 * @jest-environment node
 */
import {
  geocodeMapSearchAddress,
  looksLikeStreetAddress,
  pickAddressResult,
  shortAddressLabel,
} from "@/lib/map-address-search"
import { forwardGeocode } from "@/lib/mapboxGeocode"
import { getPlaceGoogleMapsUrl } from "@/components/map-view/place-selected-card-model"

jest.mock("@/lib/mapboxGeocode", () => ({
  forwardGeocode: jest.fn(),
}))

const mockForward = forwardGeocode as jest.MockedFunction<typeof forwardGeocode>

describe("looksLikeStreetAddress", () => {
  it("detecta calle + altura", () => {
    expect(looksLikeStreetAddress("Corrientes 1234")).toBe(true)
    expect(looksLikeStreetAddress("Av. Santa Fe 3200, Palermo")).toBe(true)
    expect(looksLikeStreetAddress("Calle 7 nro 850 La Plata")).toBe(true)
  })

  it("no confunde nombres ni barrios con direcciones", () => {
    expect(looksLikeStreetAddress("Palermo")).toBe(false)
    expect(looksLikeStreetAddress("pizza")).toBe(false)
    expect(looksLikeStreetAddress("1234")).toBe(false)
    expect(looksLikeStreetAddress("4x4")).toBe(false)
    expect(looksLikeStreetAddress("")).toBe(false)
  })
})

describe("pickAddressResult", () => {
  const base = { address: "", neighborhood: undefined, center: [0, 0] as [number, number] }

  it("ignora resultados de ciudad/región y toma el primero con precisión de calle", () => {
    const hit = pickAddressResult([
      { ...base, lat: -34.6, lng: -58.4, place_name: "Buenos Aires", place_type: ["place"] },
      { ...base, lat: -34.6037, lng: -58.3816, place_name: "Avenida Corrientes 1234, CABA", place_type: ["address"] },
    ])
    expect(hit?.place_name).toBe("Avenida Corrientes 1234, CABA")
  })

  it("null si sólo hay resultados gruesos", () => {
    expect(
      pickAddressResult([{ ...base, lat: 1, lng: 1, place_name: "Argentina", place_type: ["country"] }])
    ).toBeNull()
  })
})

describe("shortAddressLabel", () => {
  it("usa el primer tramo del place_name", () => {
    expect(shortAddressLabel("Avenida Corrientes 1234, Buenos Aires, Argentina", "x")).toBe(
      "Avenida Corrientes 1234"
    )
    expect(shortAddressLabel("", "Corrientes 1234 ")).toBe("Corrientes 1234")
  })
})

describe("geocodeMapSearchAddress", () => {
  beforeEach(() => mockForward.mockReset())

  it("no llama al geocoder si no parece dirección", async () => {
    await expect(geocodeMapSearchAddress("Palermo")).resolves.toBeNull()
    expect(mockForward).not.toHaveBeenCalled()
  })

  it("restringe a AR por defecto y devuelve el pin con la query original", async () => {
    mockForward.mockResolvedValue([
      {
        address: "Avenida Corrientes 1234, CABA",
        place_name: "Avenida Corrientes 1234, CABA",
        place_type: ["address"],
        lat: -34.6037,
        lng: -58.3816,
        center: [-58.3816, -34.6037],
      },
    ])
    const pin = await geocodeMapSearchAddress(" Corrientes 1234 ")
    expect(mockForward).toHaveBeenCalledWith(
      "Corrientes 1234",
      expect.objectContaining({ country: "ar" })
    )
    expect(pin).toEqual({
      query: "Corrientes 1234",
      lat: -34.6037,
      lng: -58.3816,
      label: "Avenida Corrientes 1234",
    })
  })

  it("usa el país de la pista geo (Brasil)", async () => {
    mockForward.mockResolvedValue([])
    await geocodeMapSearchAddress("Rua das Pedras 120, Búzios")
    expect(mockForward).toHaveBeenCalledWith(
      "Rua das Pedras 120, Búzios",
      expect.objectContaining({ country: "br" })
    )
  })
})

describe("getPlaceGoogleMapsUrl", () => {
  const location = { lat: -34.58, lng: -58.42 }

  it("con googlePlaceId abre ese lugar exacto", () => {
    const url = new URL(
      getPlaceGoogleMapsUrl({
        name: "Café Sin TACC",
        address: "Gorriti 5000",
        location,
        googlePlaceId: "ChIJabc",
      } as never)
    )
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/search/")
    expect(url.searchParams.get("api")).toBe("1")
    expect(url.searchParams.get("query")).toBe("Café Sin TACC, Gorriti 5000")
    expect(url.searchParams.get("query_place_id")).toBe("ChIJabc")
  })

  it("sin googlePlaceId busca nombre + dirección", () => {
    const url = new URL(
      getPlaceGoogleMapsUrl({ name: "Panadería", address: "Corrientes 1234", location } as never)
    )
    expect(url.searchParams.get("query")).toBe("Panadería, Corrientes 1234")
    expect(url.searchParams.has("query_place_id")).toBe(false)
  })

  it("sin dirección ni id cae a coordenadas", () => {
    const url = new URL(getPlaceGoogleMapsUrl({ name: "X", address: "", location } as never))
    expect(url.searchParams.get("query")).toBe("-34.58,-58.42")
  })
})
