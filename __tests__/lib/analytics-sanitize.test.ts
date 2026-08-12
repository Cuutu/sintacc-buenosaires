import { sanitizeAnalyticsProps } from "@/lib/analytics-sanitize"

describe("analytics sanitize", () => {
  it("elimina tokens y emails", () => {
    const clean = sanitizeAnalyticsProps({
      listId: "abc",
      token: "supersecret",
      email: "user@example.com",
      visibility: "public",
    })
    expect(clean).toEqual({ listId: "abc", visibility: "public" })
  })

  it("elimina URLs de listas privadas", () => {
    const clean = sanitizeAnalyticsProps({
      url: "https://www.celimap.com.ar/listas/privadas/abc123XYZ_token",
      source: "share",
    })
    expect(clean).toEqual({ source: "share" })
  })

  it("permite props seguros", () => {
    expect(
      sanitizeAnalyticsProps({ city: "la-plata", total: 12, hasType: true })
    ).toEqual({ city: "la-plata", total: 12, hasType: true })
  })
})
