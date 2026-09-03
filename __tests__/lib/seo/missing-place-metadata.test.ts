import { missingPlaceMetadata } from "@/lib/seo/missing-place-metadata"
import { readFileSync } from "fs"
import path from "path"

describe("404 ficha metadata", () => {
  it("title sin | CeliMap; robots noindex follow", () => {
    expect(missingPlaceMetadata.title).toBe("No encontramos este lugar")
    expect(String(missingPlaceMetadata.title)).not.toContain("| CeliMap")
    expect(missingPlaceMetadata.robots).toEqual({ index: false, follow: true })
    expect(missingPlaceMetadata.description).toMatch(/dado de baja|mapa|inicio/i)
    expect(missingPlaceMetadata).not.toHaveProperty("alternates")
    expect(missingPlaceMetadata.openGraph).toBeUndefined()
  })

  it("not-found exporta esa metadata y un H1", () => {
    const src = readFileSync(path.join(__dirname, "../../../app/not-found.tsx"), "utf8")
    expect(src).toContain("missingPlaceMetadata")
    expect(src).toContain("export const metadata")
    expect(src).toContain("No encontramos este lugar")
    expect(src).toContain('href="/"')
    expect(src).toContain('href="/mapa"')
    expect(src).not.toContain("| CeliMap")
  })

  it("BrandEmptyState del 404 es h1", () => {
    const src = readFileSync(
      path.join(__dirname, "../../../components/brand/BrandEmptyState.tsx"),
      "utf8"
    )
    expect(src).toContain("<h1")
    expect(src).not.toContain("<h2")
  })
})

describe("getApprovedPlaceByRouteParam solo approved", () => {
  it("todas las queries filtran status approved", () => {
    const src = readFileSync(path.join(__dirname, "../../../lib/place-route.ts"), "utf8")
    const finds = src.match(/Place\.findOne\(/g) || []
    expect(finds.length).toBeGreaterThanOrEqual(2)
    expect(src).toMatch(/status:\s*"approved"/)
    expect(src).not.toMatch(/status:\s*"pending"/)
    expect(src).not.toMatch(/status:\s*\{\s*\$in/)
    const queryBlocks = [...src.matchAll(/Place\.findOne\(\{([\s\S]*?)\}\)/g)]
    expect(queryBlocks.length).toBeGreaterThanOrEqual(1)
    for (const block of queryBlocks) {
      expect(block[1]).toMatch(/status:\s*"approved"/)
    }
  })
})
