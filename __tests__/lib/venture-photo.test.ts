import { getVentureCoverPhoto } from "@/lib/venture-photo"

describe("getVentureCoverPhoto", () => {
  it("usa la primera URL no vacía de photos[] (no inventa cover/OG)", () => {
    expect(getVentureCoverPhoto(["https://res.cloudinary.com/x/foto.jpg"])).toBe(
      "https://res.cloudinary.com/x/foto.jpg"
    )
    expect(getVentureCoverPhoto(["", "https://example.com/b.jpg"])).toBe("https://example.com/b.jpg")
  })

  it("null si no hay fotos", () => {
    expect(getVentureCoverPhoto([])).toBeNull()
    expect(getVentureCoverPhoto(undefined)).toBeNull()
    expect(getVentureCoverPhoto(["  "])).toBeNull()
  })
})
