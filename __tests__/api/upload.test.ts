import { POST } from "@/app/api/upload/route"
import { NextRequest } from "next/server"

jest.mock("@/lib/mongodb")
jest.mock("@/lib/middleware")
jest.mock("cloudinary")

describe("POST /api/upload", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    require("@/lib/middleware").requireAuth = jest.fn().mockResolvedValue({
      user: { id: "u1", email: "t@t.com" },
    })
  })

  it("rejects file type not in whitelist", async () => {
    const formData = new FormData()
    const blob = new Blob(["fake"], { type: "image/gif" })
    formData.set("file", blob, "photo.gif")
    formData.set("folder", "celimap")

    const request = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("no permitido")
  })

  it("rejects file exceeding 5MB", async () => {
    const formData = new FormData()
    const largeBlob = new Blob([new ArrayBuffer(6 * 1024 * 1024)], {
      type: "image/jpeg",
    })
    formData.set("file", largeBlob)
    formData.set("folder", "celimap")

    const request = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain("5MB")
  })
})
