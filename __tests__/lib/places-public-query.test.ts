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
})
