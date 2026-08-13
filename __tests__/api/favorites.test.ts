/**
 * @jest-environment node
 */
import { GET } from "@/app/api/favorites/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/mongodb")
jest.mock("@/lib/features", () => ({
  features: { favorites: true },
}))
jest.mock("@/lib/middleware", () => ({
  requireAuth: jest.fn().mockResolvedValue({
    user: { id: "64b0c0c0c0c0c0c0c0c0c0c0" },
  }),
}))
jest.mock("@/models/Favorite")
jest.mock("@/models/Place")

describe("GET /api/favorites", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("ids=1 returns placeIds without populate", async () => {
    const oid = "64b0c0c0c0c0c0c0c0c0c0c1"
    require("@/models/Favorite").Favorite.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ placeId: oid }]),
      }),
    })

    const request = new NextRequest("http://localhost:3000/api/favorites?ids=1")
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.placeIds).toEqual([oid])
    expect(require("@/models/Favorite").Favorite.find().populate).toBeUndefined()
  })
})
