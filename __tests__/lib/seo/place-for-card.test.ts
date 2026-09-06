import { getPlacePath } from "@/lib/place-url"
import { placeSeoToCardPlace } from "@/lib/seo/place-for-card"
import type { PlaceSEO } from "@/lib/seo/places"
import { readFileSync } from "fs"
import path from "path"

const OBJECT_ID = "6a7be36e3c2912d76e2767d6"
const SLUG = "gout-caballito-caballito"

function seoPlace(overrides: Partial<PlaceSEO> = {}): PlaceSEO {
  return {
    _id: OBJECT_ID,
    slug: SLUG,
    name: "Gout",
    type: "bakery",
    neighborhood: "Caballito",
    ...overrides,
  }
}

describe("placeSeoToCardPlace", () => {
  it("href de ficha usa slug del sitemap, no ObjectId", () => {
    const card = placeSeoToCardPlace(seoPlace())
    expect(getPlacePath(card)).toBe(`/lugar/${SLUG}`)
    expect(getPlacePath(card)).not.toBe(`/lugar/${OBJECT_ID}`)
  })

  it("sin slug cae a _id (dato incompleto)", () => {
    const card = placeSeoToCardPlace(seoPlace({ slug: undefined }))
    expect(getPlacePath(card)).toBe(`/lugar/${OBJECT_ID}`)
  })
})

describe("listados SEO pasan slug a PlaceCard", () => {
  const root = path.join(__dirname, "../../..")
  const files = [
    "components/seo/PlaceListWithFilters.tsx",
    "components/seo/ProvincialPlaceCard.tsx",
    "app/top-sin-gluten/ciudad/[ciudadSlug]/page.tsx",
  ]

  it.each(files)("%s usa placeSeoToCardPlace", (rel) => {
    const src = readFileSync(path.join(root, rel), "utf8")
    expect(src).toContain("placeSeoToCardPlace")
    expect(src).not.toMatch(/_id:\s*p\._id,\s*\n\s*name:/)
  })
})
