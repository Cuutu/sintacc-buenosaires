/**
 * @jest-environment node
 */
import { readFileSync } from "fs"
import path from "path"
import { inferSafetyLevel } from "@/components/featured/featured-utils"
import { placeOfferPhrase } from "@/lib/seo/place-metadata"

const root = path.join(__dirname, "../../..")
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8")

const PUBLIC_COPY_FILES = [
  "app/mapa-sin-tacc/page.tsx",
  "app/mapa-celiaco/page.tsx",
  "app/mapa-para-celiacos/page.tsx",
  "components/seo/MapLandingPage.tsx",
  "lib/seo/templates.ts",
  "lib/seo/ciudades-data.ts",
  "app/sin-gluten-argentina/page.tsx",
  "components/seo/ArgentinaLandingJsonLd.tsx",
  "components/seo/EmptyCityPage.tsx",
  "components/seo/ProvincePageContent.tsx",
  "components/seo/PlaceJsonLd.tsx",
  "lib/venture-seo.ts",
  "docs/store/LISTING-COPY.md",
  "README.md",
]

const BANNED = [
  /verificados por la comunidad/i,
  /lugares verificados/i,
  /reseñas reales/i,
  /mapa celíaco confiable/i,
  /lugares con certificación/i,
  /disfrutar sin preocupaciones/i,
  /sello 100%/i,
  /100% seguro/i,
  /apto garantizado/i,
  /lugares seguros para celíacos/i,
]

describe("public copy: claims y marca", () => {
  it("páginas y templates SEO no usan claims de certificación/garantía", () => {
    for (const rel of PUBLIC_COPY_FILES) {
      const src = read(rel)
      for (const re of BANNED) {
        expect(`${rel}: ${src}`).not.toMatch(re)
      }
    }
  })

  it("landings de mapa y templates no escriben Celimap como marca visible", () => {
    const files = [
      "app/mapa-sin-tacc/page.tsx",
      "app/mapa-celiaco/page.tsx",
      "components/seo/MapLandingPage.tsx",
      "lib/seo/templates.ts",
      "lib/seo/ciudades-data.ts",
      "app/sin-gluten-argentina/page.tsx",
      "components/seo/ArgentinaLandingJsonLd.tsx",
      "components/seo/EmptyCityPage.tsx",
      "components/seo/ProvincePageContent.tsx",
      "lib/venture-seo.ts",
    ]
    for (const rel of files) {
      const src = read(rel)
      expect(src).not.toContain("Celimap")
    }
  })

  it("PlaceJsonLd usa inferSafetyLevel para clasificación consistente con badge", () => {
    const src = read("components/seo/PlaceJsonLd.tsx")
    expect(src).toContain("inferSafetyLevel")
    expect(src).toContain('safety === "dedicated_gf"')
    expect(src).toContain('safety === "gf_options"')
  })

  it("PlaceJsonLd description y servesCuisine reflejan clasificación real", () => {
    const src = read("components/seo/PlaceJsonLd.tsx")
    
    // No debe hardcodear "con opciones" para todos
    expect(src).not.toMatch(/description:\s*`[^`]*con opciones Sin TACC[^`]*`/)
    
    // servesCuisine debe ser condicional, no hardcodeado
    expect(src).not.toMatch(/servesCuisine:\s*"Comida sin gluten",/)
    
    // Debe usar la inferencia
    const lines = src.split('\n')
    const safetyLine = lines.findIndex(l => l.includes('const safety = inferSafetyLevel'))
    const dedicatedCheck = lines.findIndex(l => l.includes('safety === "dedicated_gf"'))
    const optionsCheck = lines.findIndex(l => l.includes('safety === "gf_options"'))
    
    expect(safetyLine).toBeGreaterThan(-1)
    expect(dedicatedCheck).toBeGreaterThan(safetyLine)
    expect(optionsCheck).toBeGreaterThan(safetyLine)
  })

  it("layout pasa tags y safetyLevel a PlaceJsonLd", () => {
    const src = read("app/lugar/[id]/layout.tsx")
    expect(src).toContain("tags: place.tags")
    expect(src).toContain("safetyLevel: place.safetyLevel")
  })

  it("inferSafetyLevel y placeOfferPhrase son consistentes", () => {
    const testCases = [
      { tags: ["100_gf"], safetyLevel: undefined, expectedSafety: "dedicated_gf", expectedOffer: "sin TACC" },
      { tags: ["opciones_sin_tacc"], safetyLevel: undefined, expectedSafety: "gf_options", expectedOffer: "con opciones sin TACC" },
      { tags: undefined, safetyLevel: "dedicated_gf" as const, expectedSafety: "dedicated_gf", expectedOffer: "sin TACC" },
      { tags: undefined, safetyLevel: "gf_options" as const, expectedSafety: "gf_options", expectedOffer: "con opciones sin TACC" },
      { tags: undefined, safetyLevel: "unknown" as const, expectedSafety: "unknown", expectedOffer: "" },
      { tags: [], safetyLevel: undefined, expectedSafety: undefined, expectedOffer: "" },
    ]

    for (const tc of testCases) {
      const safety = inferSafetyLevel({ tags: tc.tags, safetyLevel: tc.safetyLevel })
      const offer = placeOfferPhrase({ tags: tc.tags, safetyLevel: tc.safetyLevel, name: "Test", type: "restaurant" })
      
      expect(safety).toBe(tc.expectedSafety)
      expect(offer).toBe(tc.expectedOffer)
    }
  })
})
