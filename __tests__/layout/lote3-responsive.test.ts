/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"
import {
  findHorizontalOverflow,
  statsCarouselCardWidthCss,
  LEGITIMATE_OVERFLOW_MARKERS,
} from "@/lib/overflow-audit"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("overflow-audit helpers", () => {
  it("detecta overflow horizontal accidental", () => {
    const hits = findHorizontalOverflow(
      [
        { left: 0, right: 320 },
        { left: -8, right: 300 },
        { left: 10, right: 340 },
      ],
      320
    )
    expect(hits).toHaveLength(2)
    expect(hits[0].overflowLeft).toBe(8)
    expect(hits[1].overflowRight).toBe(20)
  })

  it("ignora overflow con marcador legítimo explícito", () => {
    const hits = findHorizontalOverflow(
      [
        {
          left: -20,
          right: 400,
          allowedMarker: "stats-carousel",
        },
      ],
      320
    )
    expect(hits).toHaveLength(0)
  })

  it("stats card width deja peek intencional", () => {
    expect(statsCarouselCardWidthCss()).toBe("min(260px, 82vw)")
    expect(statsCarouselCardWidthCss()).not.toMatch(/100vw/)
  })
})

describe("Lote 3 responsive contracts", () => {
  it("StatsRow: bloque único responsive (sin carrusel overflow)", () => {
    const src = read("components/home/StatsRow.tsx")
    expect(src).toContain('data-testid="home-stats"')
    expect(src).toContain("md:grid-cols-3")
    expect(src).toContain("divide-y")
    expect(src).toContain("md:divide-x")
    expect(src).not.toContain("snap-x")
    expect(src).not.toContain("statsCarouselCardWidthCss")
    expect(src).not.toMatch(/100vw/)
    expect(src).not.toMatch(/-mx-4/)
  })

  it("SearchBar: apila en mobile, targets 48px", () => {
    const src = read("components/search-bar.tsx")
    expect(src).toContain("flex-col")
    expect(src).toContain("sm:flex-row")
    expect(src).toContain("min-h-[48px]")
    expect(src).toContain("min-w-0")
  })

  it("BottomNav: cabe en 320 (márgenes left-2, items shrink)", () => {
    const src = read("components/nav/BottomNav.tsx")
    expect(src).toContain("left-2")
    expect(src).toContain("right-2")
    expect(src).toContain("min-w-[44px]")
    expect(src).toContain('data-testid="bottom-nav"')
    // Sin labels de texto visibles que ensanchen
    expect(src).not.toMatch(/>\s*\{label\}\s*</)
  })

  it("StickyActionBar sin doble clearance (contrato L2 intacto)", () => {
    const src = read("components/lugar/StickyActionBarMobile.tsx")
    expect(src).toContain("bottom-[var(--bottom-nav-clearance)]")
    const matches = src.match(/bottom-nav-clearance/g) || []
    expect(matches.length).toBe(1)
  })

  it("no introduce 1.1rem ni overflow-x-hidden global en layout", () => {
    expect(read("app/layout.tsx")).not.toMatch(/overflow-x-hidden/)
    expect(read("app/page.tsx")).not.toMatch(/1\.1rem/)
    expect(read("components/map-view/MapTopBar.tsx")).not.toMatch(/1\.1rem/)
  })

  it("MapTopBar chips overflow marcado legítimo; min-w-0 en buscador", () => {
    const src = read("components/map-view/MapTopBar.tsx")
    expect(src).toContain('data-overflow-allowed="map-chips"')
    expect(src).toContain("min-w-0")
    expect(src).toContain("left-2")
  })

  it("MapScreen sigue resolviendo una sola variante (no remount dual)", () => {
    const src = read("components/map-view/MapScreen.tsx")
    expect(src).toMatch(/resolveMapVariant|useIsMobile/)
    // No montar Desktop y Mobile juntos
    expect(src).not.toMatch(/<>\s*<MapDesktop[\s\S]*<MapMobile/)
  })

  it("marcadores legítimos documentados en overflow-audit", () => {
    expect(LEGITIMATE_OVERFLOW_MARKERS.length).toBeGreaterThanOrEqual(2)
    expect(LEGITIMATE_OVERFLOW_MARKERS.join(" ")).toContain("stats-carousel")
  })

  it("favoritos / error routes no quedan vacíos por contrato L1", () => {
    expect(read("app/favoritos/page.tsx")).toMatch(/status|Favoritos|session/)
    expect(fs.existsSync(path.join(root, "app/error.tsx"))).toBe(true)
    expect(fs.existsSync(path.join(root, "app/global-error.tsx"))).toBe(true)
  })
})
