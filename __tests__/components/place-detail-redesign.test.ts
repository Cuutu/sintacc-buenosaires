/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("rediseño ficha lugar", () => {
  it("hero mobile 220px con badge y acciones flotantes", () => {
    const src = read("components/lugar/PlaceHero.tsx")
    const ui = read("components/lugar/place-detail-ui.ts")
    expect(src).toContain("h-[220px]")
    expect(ui).toContain("100% Sin TACC")
    expect(ui).toContain("Con opciones")
    expect(src).toContain("emptyHeroPinSrc")
    expect(src).toContain("Volver")
    expect(src).toContain("Compartir")
    expect(src).toContain('variant="icon"')
    expect(src).toContain("Foto: Google")
  })

  it("hero vacío usa pin Con opciones / logo CeliMap", () => {
    const ui = read("components/lugar/place-detail-ui.ts")
    const reviews = read("components/lugar/PlaceCommunityReviews.tsx")
    expect(ui).toContain("/map/pin-options.png")
    expect(ui).toContain("/map/pin-dedicated.png")
    expect(reviews).toContain("/CelimapLOGO.png")
  })

  it("un solo CTA principal Cómo llegar, sin barra Ir", () => {
    const page = read("app/lugar/[id]/page.tsx")
    const actions = read("components/lugar/PlacePrimaryActions.tsx")
    const ui = read("components/lugar/place-detail-ui.ts")
    expect(actions).toContain("Cómo llegar")
    expect(ui).toContain("h-[52px]")
    expect(ui).toContain("#C85A2E")
    expect(page).not.toContain("StickyActionBarMobile")
    expect(page).toContain("PlacePrimaryActions")
    expect(page).toContain("lg:hidden")
  })

  it("reseñas de la comunidad van antes que Google", () => {
    const page = read("app/lugar/[id]/page.tsx")
    const community = page.indexOf("PlaceCommunityReviews")
    const google = page.indexOf("PlaceGoogleSection")
    expect(community).toBeGreaterThan(-1)
    expect(google).toBeGreaterThan(community)
  })

  it("desktop usa aside sticky compacta, no sidebar pesada con nombre", () => {
    const aside = read("components/lugar/PlaceDesktopAside.tsx")
    expect(aside).toContain("sticky")
    expect(aside).toContain("PlacePrimaryActions")
    expect(aside).toContain("PlaceReportCard")
    expect(aside).not.toContain("avgRating")
  })

  it("cercanos máximo 5 en rail horizontal", () => {
    const rail = read("components/lugar/PlaceNearbyRail.tsx")
    expect(rail).toContain("slice(0, 5)")
    expect(rail).toContain("overflow-x-auto")
    expect(rail).toContain('data-overflow-allowed="nearby-rail"')
  })
})
