import { buildPlaceSlug } from "@/lib/place-slugs"

describe("buildPlaceSlug", () => {
  it("builds a readable slug from place name and neighborhood", () => {
    expect(buildPlaceSlug("La Unión Gluten Free", "Caballito")).toBe(
      "la-union-gluten-free-caballito"
    )
  })

  it("removes punctuation and repeated separators", () => {
    expect(buildPlaceSlug("Café & Bakery!!!", "  Núñez  ")).toBe(
      "cafe-bakery-nunez"
    )
  })
})


describe("nextPreviousSlugs (historial al renombrar)", () => {
  const { nextPreviousSlugs, MAX_PREVIOUS_SLUGS } = jest.requireActual("@/lib/place-slugs") as typeof import("@/lib/place-slugs")

  it("guarda el slug viejo primero", () => {
    expect(nextPreviousSlugs(undefined, "van-dyke-palermo", "van-dyke-villa-crespo")).toEqual(["van-dyke-palermo"])
    expect(nextPreviousSlugs(["a"], "b", "c")).toEqual(["b", "a"])
  })

  it("si el slug no cambia, deja el historial como estaba", () => {
    expect(nextPreviousSlugs(undefined, "igual", "igual")).toBeUndefined()
    expect(nextPreviousSlugs(["a"], "igual", "igual")).toEqual(["a"])
    expect(nextPreviousSlugs(undefined, undefined, "nuevo")).toBeUndefined()
  })

  it("volver a un nombre anterior lo saca del historial y no repite", () => {
    expect(nextPreviousSlugs(["a", "b"], "c", "a")).toEqual(["c", "b"])
    expect(nextPreviousSlugs(["b", "a"], "b", "z")).toEqual(["b", "a"])
  })

  it(`guarda como mucho ${10} slugs`, () => {
    const many = Array.from({ length: 15 }, (_, i) => `s${i}`)
    expect(nextPreviousSlugs(many, "viejo", "nuevo")).toHaveLength(MAX_PREVIOUS_SLUGS)
    expect(nextPreviousSlugs(many, "viejo", "nuevo")?.[0]).toBe("viejo")
  })
})

describe("slug viejo → 301 (estructura)", () => {
  const { readFileSync } = jest.requireActual("fs") as typeof import("fs")
  const path = jest.requireActual("path") as typeof import("path")
  const read = (rel: string) => readFileSync(path.join(__dirname, "../..", rel), "utf8")

  it("el loader busca en previousSlugs si no encuentra el slug", () => {
    const src = read("lib/place-route.ts")
    expect(src).toMatch(/findOne\(\{ previousSlugs: routeParam, status: "approved" \}\)/)
    expect(src).toContain(".select(PUBLIC_PLACE_PAGE_SELECT)")
  })

  it("la ficha redirige 301 cuando la URL no es el slug actual", () => {
    expect(read("app/lugar/[id]/page.tsx")).toMatch(/if \(place\.slug && place\.slug !== id\) \{\s*permanentRedirect/)
  })

  it("el PATCH guarda el slug viejo y generateUniquePlaceSlug no reusa slugs viejos de otros", () => {
    expect(read("app/api/places/[id]/route.ts")).toContain("nextPreviousSlugs(existing.previousSlugs, existing.slug, nextSlug)")
    expect(read("lib/place-slugs.ts")).toMatch(/\{ previousSlugs: pattern \}/)
  })

  it("el índice está en el schema y en ensure-release-indexes", () => {
    expect(read("models/Place.ts")).toContain("PlaceSchema.index({ previousSlugs: 1 }, { sparse: true })")
    expect(read("scripts/ensure-release-indexes.ts")).toContain('name: "previousSlugs_1"')
  })
})
