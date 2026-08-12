/**
 * @jest-environment node
 */
import { GET, POST } from "@/app/api/reviews/route"
import { NextRequest } from "next/server"
import connectDB from "@/lib/mongodb"
import { Review } from "@/models/Review"
import { Place } from "@/models/Place"
import { User } from "@/models/User"

/** ObjectIds válidos (24 hex) — la API valida con mongoose.Types.ObjectId.isValid */
const PLACE_ID = "507f1f77bcf86cd799439011"
const USER_ID = "507f1f77bcf86cd799439012"
const REVIEW_ID = "507f1f77bcf86cd799439013"

jest.mock("@/lib/mongodb")
jest.mock("@/lib/middleware")
jest.mock("@/lib/rate-limit")
jest.mock("@/models/Review")
jest.mock("@/models/Place")
jest.mock("@/models/User")

describe("POST /api/reviews", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should create a review successfully", async () => {
    const mockSession = {
      user: {
        id: USER_ID,
        email: "test@example.com",
        role: "user",
      },
    }

    require("@/lib/middleware").requireAuth = jest.fn().mockResolvedValue(mockSession)
    require("@/lib/rate-limit").checkRateLimit = jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 2,
    })
    require("@/models/Place").Place.findById = jest.fn().mockResolvedValue({
      _id: PLACE_ID,
      name: "Test Place",
    })

    const mockReview = {
      save: jest.fn().mockResolvedValue(true),
      _id: REVIEW_ID,
    }
    require("@/models/Review").Review = jest.fn().mockReturnValue(mockReview)

    const request = new NextRequest("http://localhost:3000/api/reviews", {
      method: "POST",
      body: JSON.stringify({
        placeId: PLACE_ID,
        rating: 5,
        safeFeeling: true,
        separateKitchen: "yes",
        comment: "Excelente lugar, muy seguro",
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toHaveProperty("_id")
  })

  it("should return 429 when rate limit exceeded", async () => {
    const mockSession = {
      user: {
        id: USER_ID,
        email: "test@example.com",
        role: "user",
      },
    }

    require("@/lib/middleware").requireAuth = jest.fn().mockResolvedValue(mockSession)
    require("@/lib/rate-limit").checkRateLimit = jest.fn().mockResolvedValue({
      allowed: false,
      remaining: 0,
    })

    const request = new NextRequest("http://localhost:3000/api/reviews", {
      method: "POST",
      body: JSON.stringify({
        placeId: PLACE_ID,
        rating: 5,
        safeFeeling: true,
        separateKitchen: "yes",
        comment: "Test comment",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(429)
  })
})

describe("GET /api/reviews", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const mockReviews = [
      {
        _id: REVIEW_ID,
        placeId: PLACE_ID,
        rating: 5,
        comment: "Excelente",
        userId: { name: "Test User" },
      },
    ]
    require("@/models/Review").Review.find = jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockReviews),
            }),
          }),
        }),
      }),
    })
    require("@/models/Review").Review.countDocuments = jest.fn().mockResolvedValue(1)
  })

  it("returns reviews with pagination", async () => {
    const request = new NextRequest(
      `http://localhost:3000/api/reviews?placeId=${PLACE_ID}`
    )
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reviews).toHaveLength(1)
    expect(data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      pages: 1,
    })
  })
})
