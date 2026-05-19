/**
 * @jest-environment node
 */
import { GET } from "@/app/api/places/[id]/route"
import { NextRequest } from "next/server"
import mongoose from "mongoose"

jest.mock("@/lib/mongodb")
jest.mock("@/lib/api-cache", () => ({
  invalidateApiCache: jest.fn(),
}))
jest.mock("@/models/Place")
jest.mock("@/models/Review")
jest.mock("@/models/ContaminationReport")

describe("GET /api/places/[id]", () => {
  const validId = new mongoose.Types.ObjectId().toString()

  beforeEach(() => {
    jest.clearAllMocks()
    require("@/models/Review").Review.aggregate = jest.fn().mockResolvedValue([])
    require("@/models/ContaminationReport").ContaminationReport.countDocuments = jest
      .fn()
      .mockResolvedValue(0)
  })

  it("filters public GET by approved status", async () => {
    const findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    })
    require("@/models/Place").Place.findOne = findOne

    const request = new NextRequest(`http://localhost:3000/api/places/${validId}`)
    const response = await GET(request, { params: { id: validId } })

    expect(response.status).toBe(404)
    expect(findOne).toHaveBeenCalledWith({
      _id: new mongoose.Types.ObjectId(validId),
      status: "approved",
    })
  })
})
