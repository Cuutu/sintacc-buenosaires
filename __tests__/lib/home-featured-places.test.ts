/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"
import { isHomeFeaturable } from "@/lib/home/get-home-featured-places"

jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))

describe("destacados de la home: solo 100% sin TACC", () => {
  it("usa la misma regla que la etiqueta (tags primero, opciones gana)", () => {
    expect(isHomeFeaturable({ tags: ["100_gf"] })).toBe(true)
    expect(isHomeFeaturable({ tags: [], safetyLevel: "dedicated_gf" })).toBe(true)
    expect(isHomeFeaturable({ tags: ["100_gf", "opciones_sin_tacc"] })).toBe(false)
    expect(isHomeFeaturable({ tags: ["opciones_sin_tacc"], safetyLevel: "dedicated_gf" })).toBe(false)
    expect(isHomeFeaturable({ tags: [], safetyLevel: "gf_options" })).toBe(false)
    expect(isHomeFeaturable({ tags: ["certificado_sin_tacc"] })).toBe(false)
  })

  it("la consulta filtra en Mongo y el cliente también filtra su respaldo", () => {
    const root = path.join(__dirname, "../..")
    const loader = fs.readFileSync(path.join(root, "lib/home/get-home-featured-places.ts"), "utf8")
    const client = fs.readFileSync(path.join(root, "components/home/HomeFeatured.tsx"), "utf8")
    expect(loader).toContain("DISPLAY_DEDICATED_MATCH")
    // Suma los más reseñados en CeliMap aunque tengan pocas reseñas en Google.
    expect(loader).toContain("getMostReviewedPlaceIds(FEATURED_TRUST.minCelimapReviews")
    expect(client).toContain('inferSafetyLevel(place) === "dedicated_gf"')
    expect(client).toContain("loop: false")
  })

  it("una sucursal por marca, en el servidor y en el respaldo del cliente", () => {
    const root = path.join(__dirname, "../..")
    const loader = fs.readFileSync(path.join(root, "lib/home/get-home-featured-places.ts"), "utf8")
    const client = fs.readFileSync(path.join(root, "components/home/HomeFeatured.tsx"), "utf8")
    expect(loader).toContain("uniqueByBrand(rankFeaturedCandidates(withStats))")
    expect(client).toContain("uniqueByBrand(rankFeaturedCandidates(")
  })
})
