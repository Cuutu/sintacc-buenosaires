/**
 * @jest-environment node
 */
import { POST } from "@/app/api/upload/route"
import { NextRequest } from "next/server"
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_LABEL } from "@/lib/upload-limits"

jest.mock("@/lib/mongodb")
jest.mock("@/lib/middleware")
jest.mock("cloudinary")
jest.mock("@/lib/logger", () => ({
  logApiError: jest.fn(),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

describe("POST /api/upload", () => {
  const prevCloud = process.env.CLOUDINARY_CLOUD_NAME
  const prevKey = process.env.CLOUDINARY_API_KEY
  const prevSecret = process.env.CLOUDINARY_API_SECRET

  beforeEach(() => {
    jest.clearAllMocks()
    // Sin Cloudinary: validación de archivo debe responder 400, no 500.
    delete process.env.CLOUDINARY_CLOUD_NAME
    delete process.env.CLOUDINARY_API_KEY
    delete process.env.CLOUDINARY_API_SECRET
    require("@/lib/middleware").requireAuth = jest.fn().mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439011", email: "t@t.com" },
    })
    require("@/lib/middleware").requireAdmin = jest.fn().mockResolvedValue({
      user: { id: "507f1f77bcf86cd799439011", email: "t@t.com", role: "admin" },
    })
  })

  afterEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = prevCloud
    process.env.CLOUDINARY_API_KEY = prevKey
    process.env.CLOUDINARY_API_SECRET = prevSecret
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

  it(`rejects file exceeding ${UPLOAD_MAX_LABEL} (${UPLOAD_MAX_BYTES} bytes / MiB)`, async () => {
    const formData = new FormData()
    const largeBlob = new Blob([new ArrayBuffer(UPLOAD_MAX_BYTES + 1)], {
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
    expect(data.error).toContain(UPLOAD_MAX_LABEL)
  })

  it("allows exactly UPLOAD_MAX_BYTES when Cloudinary is configured", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud"
    process.env.CLOUDINARY_API_KEY = "test-key"
    process.env.CLOUDINARY_API_SECRET = "test-secret"

    const cloudinary = require("cloudinary")
    cloudinary.v2.uploader.upload = jest.fn(
      (
        _data: string,
        _opts: unknown,
        cb: (err: Error | null, res: { secure_url: string } | undefined) => void
      ) => {
        cb(null, { secure_url: "https://res.cloudinary.com/test/image.jpg" })
      }
    )

    // JPEG magic bytes + padding to exact max size
    const bytes = new Uint8Array(UPLOAD_MAX_BYTES)
    bytes[0] = 0xff
    bytes[1] = 0xd8
    bytes[2] = 0xff
    const formData = new FormData()
    formData.set("file", new Blob([bytes], { type: "image/jpeg" }), "ok.jpg")
    formData.set("folder", "celimap")

    const request = new NextRequest("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.url).toContain("cloudinary.com")
  })
})
