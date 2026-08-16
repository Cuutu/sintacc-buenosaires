/**
 * @jest-environment node
 */
import {
  googlePhotoMediaUrl,
  placeNeedsGoogleCoverPhoto,
} from "@/lib/google-place-photos"

describe("google place cover photos", () => {
  it("solo lugares con googlePlaceId y sin foto", () => {
    expect(
      placeNeedsGoogleCoverPhoto({ googlePlaceId: "ChIJ123", photos: [] })
    ).toBe(true)
    expect(
      placeNeedsGoogleCoverPhoto({ googlePlaceId: "ChIJ123", photos: ["https://x"] })
    ).toBe(false)
    expect(placeNeedsGoogleCoverPhoto({ googlePlaceId: "", photos: [] })).toBe(false)
    expect(placeNeedsGoogleCoverPhoto({ photos: [] })).toBe(false)
  })

  it("arma URL de media Places API New", () => {
    const url = googlePhotoMediaUrl("places/ChIJ1/photos/ABC", "key-1")
    expect(url).toContain("https://places.googleapis.com/v1/places/ChIJ1/photos/ABC/media")
    expect(url).toContain("maxWidthPx=1200")
    expect(url).toContain("key=key-1")
  })
})
