/**
 * @jest-environment node
 */
import { readFileSync } from "fs"
import path from "path"

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
})
