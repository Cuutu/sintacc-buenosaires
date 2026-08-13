import { buildPublicPlacesMongoQuery, filterPlacesByBbox } from "@/lib/places-public-query"

describe("buildPublicPlacesMongoQuery", () => {
  it("keeps text search when a city filter is present", () => {
    const query = buildPublicPlacesMongoQuery({
      search: "Sintacc",
      citySlugs: ["buenos-aires"],
      page: 1,
      limit: 20,
    })

    expect(query.status).toBe("approved")
    expect(query.$and).toEqual([
      {
        $or: expect.arrayContaining([
          { name: expect.any(RegExp) },
          { address: expect.any(RegExp) },
          { addressText: expect.any(RegExp) },
          { neighborhood: expect.any(RegExp) },
          { userProvidedNeighborhood: expect.any(RegExp) },
          { userProvidedReference: expect.any(RegExp) },
        ]),
      },
    ])
    expect(query.locality).toEqual({ $in: ["buenos-aires"] })
  })

  it("filters by provinceSlugs using the normalized province field", () => {
    const query = buildPublicPlacesMongoQuery({
      provinceSlugs: ["cordoba"],
      page: 1,
      limit: 20,
    })

    expect(query.status).toBe("approved")
    expect(query.province).toEqual({ $in: ["cordoba"] })
  })

  it("filters by localitySlugs using the normalized locality field", () => {
    const query = buildPublicPlacesMongoQuery({
      localitySlugs: ["la-plata", "mar-del-plata"],
      page: 1,
      limit: 20,
    })

    expect(query.status).toBe("approved")
    expect(query.locality).toEqual({ $in: ["la-plata", "mar-del-plata"] })
  })

  it("matches neighborhood aliases when filtering by neighborhood", () => {
    const query = buildPublicPlacesMongoQuery({
      neighborhood: "Recoleta",
      page: 1,
      limit: 20,
    })

    expect(query.status).toBe("approved")
    const neighborhoodMatchers = (query.$and?.[0] as any).$or[0].neighborhood.$in as RegExp[]

    expect(neighborhoodMatchers).toEqual(
      expect.arrayContaining([expect.any(RegExp), expect.any(RegExp), expect.any(RegExp)])
    )
    expect(neighborhoodMatchers.some((regex) => regex.test("Recoleta"))).toBe(true)
    expect(neighborhoodMatchers.some((regex) => regex.test("Barrio Norte"))).toBe(true)
    expect(neighborhoodMatchers.some((regex) => regex.test("La Isla"))).toBe(true)
  })

  it("matches neighborhoods with or without accents", () => {
    const query = buildPublicPlacesMongoQuery({
      neighborhood: "San Nicolas",
      page: 1,
      limit: 20,
    })
    const neighborhoodMatchers = (query.$and?.[0] as any).$or[0].neighborhood.$in as RegExp[]

    expect(neighborhoodMatchers.some((regex) => regex.test("San Nicolas"))).toBe(true)
    expect(neighborhoodMatchers.some((regex) => regex.test("San Nicolás"))).toBe(true)
  })

  it("filters featured places when featured=true", () => {
    const query = buildPublicPlacesMongoQuery({
      featured: true,
      page: 1,
      limit: 3,
    })
    expect(query.status).toBe("approved")
    expect(query.featured).toBe(true)
  })

  it("does not put bbox into the Mongo query", () => {
    const query = buildPublicPlacesMongoQuery({
      bbox: { west: -58.5, south: -34.8, east: -58.3, north: -34.4 },
      page: 1,
      limit: 5000,
    })
    expect(query["location.lat"]).toBeUndefined()
    expect(query["location.lng"]).toBeUndefined()
  })

  it("filters places by bbox in memory", () => {
    const places = [
      { id: "in", location: { lat: -34.6, lng: -58.4 } },
      { id: "out", location: { lat: -22.75, lng: -41.89 } },
    ]
    const filtered = filterPlacesByBbox(places, {
      west: -58.5,
      south: -34.8,
      east: -58.3,
      north: -34.4,
    })
    expect(filtered.map((p) => p.id)).toEqual(["in"])
  })
})