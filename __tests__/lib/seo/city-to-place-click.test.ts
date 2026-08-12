/**
 * @jest-environment node
 */
import { sanitizeAnalyticsProps } from "@/lib/analytics-sanitize"

describe("city_to_place_click props", () => {
  it("shape tipada sobrevive sanitize", () => {
    expect(
      sanitizeAnalyticsProps({
        city_slug: "la-plata",
        place_id: "abc123",
        position: 1,
        source: "city_page",
      })
    ).toEqual({
      city_slug: "la-plata",
      place_id: "abc123",
      position: 1,
      source: "city_page",
    })
  })

  it("bloquea secretos mezclados", () => {
    expect(
      sanitizeAnalyticsProps({
        city_slug: "la-plata",
        place_id: "abc123",
        position: 2,
        source: "city_category:restaurantes",
        token: "nope",
        email: "x@y.com",
      })
    ).toEqual({
      city_slug: "la-plata",
      place_id: "abc123",
      position: 2,
      source: "city_category:restaurantes",
    })
  })
})
