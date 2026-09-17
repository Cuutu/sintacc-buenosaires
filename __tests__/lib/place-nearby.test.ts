/**
 * @jest-environment node
 */
import { getNearbyPlacesForPlace } from "@/lib/place-nearby"

jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/models/Place", () => ({
  Place: {
    find: jest.fn(),
  },
}))

function mockFind(docs: unknown[]) {
  const { Place } = require("@/models/Place")
  const lean = jest.fn().mockResolvedValue(docs)
  Place.find.mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean,
      limit: jest.fn().mockReturnValue({ lean }),
    }),
  })
  return { lean }
}

describe("getNearbyPlacesForPlace", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("ranks by haversine inside 2km and ignores $geoNear", () => {
    const { Place } = require("@/models/Place")
    const { lean } = mockFind([
      {
        _id: { toString: () => "507f1f77bcf86cd799439012" },
        name: "Cerca",
        type: "cafe",
        location: { lat: -34.604, lng: -58.382 },
      },
      {
        _id: { toString: () => "507f1f77bcf86cd799439013" },
        name: "Lejos",
        type: "cafe",
        location: { lat: -34.7, lng: -58.5 },
      },
    ])

    return getNearbyPlacesForPlace({
      _id: { toString: () => "507f1f77bcf86cd799439011" },
      neighborhood: "Moreno",
      location: { lat: -34.6037, lng: -58.3816 },
    }).then((cards) => {
      const query = Place.find.mock.calls[0][0]
      expect(query.status).toBe("approved")
      expect(query["location.lat"]).toEqual({ $gte: expect.any(Number), $lte: expect.any(Number) })
      expect(query["location.lng"]).toEqual({ $gte: expect.any(Number), $lte: expect.any(Number) })
      expect(query).not.toHaveProperty("$geoNear")
      expect(query).not.toHaveProperty("$near")
      expect(lean).toHaveBeenCalled()
      expect(cards.map((c) => c._id)).toEqual(["507f1f77bcf86cd799439012"])
    })
  })
})
