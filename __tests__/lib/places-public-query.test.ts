import { buildPublicPlacesMongoQuery } from "@/lib/places-public-query"

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
    expect(query.neighborhood).toEqual(expect.objectContaining({ $in: expect.any(Array) }))
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
})
