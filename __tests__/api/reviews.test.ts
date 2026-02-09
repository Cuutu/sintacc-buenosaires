import { POST } from "@/app/api/reviews/route"
import { NextRequest } from "next/server"
import { connectDB } from "@/lib/mongodb"
import { Review } from "@/models/Review"
import { Place } from "@/models/Place"
import { User } from "@/models/User"

// Mock dependencies
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
        id: "user123",
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
      _id: "place123",
      name: "Test Place",
    })

    const mockReview = {
      save: jest.fn().mockResolvedValue(true),
      _id: "review123",
    }
    require("@/models/Review").Review = jest.fn().mockReturnValue(mockReview)

    const request = new NextRequest("http://localhost:3000/api/reviews", {
      method: "POST",
      body: JSON.stringify({
        placeId: "place123",
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
        id: "user123",
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
        placeId: "place123",
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
