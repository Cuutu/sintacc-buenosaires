/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("catálogo /emprendimientos", () => {
  it("hero compacto centrado en emprendimientos, no landing informativa", () => {
    const src = read("app/emprendimientos/EmprendimientosPageContent.tsx")
    expect(src).toContain("Emprendimientos")
    expect(src).toContain("100% sin gluten")
    expect(src).toContain("h-14")
    expect(src).toContain("Buscar viandas, panificados, pastelería o una ciudad")
    expect(src).toContain("SuggestVentureCta")
    expect(src).not.toContain("VenturesExplainer")
    expect(src).not.toContain("VentureFeaturedRail")
    expect(src).not.toContain("Una sección para emprendimientos que no siempre tienen local")
  })

  it("search aplica categoría en sugerencia y Enter; nunca caja muda", () => {
    const src = read("app/emprendimientos/EmprendimientosPageContent.tsx")
    expect(src).toContain("applyCategory")
    expect(src).toContain('if (e.key === "Enter")')
    expect(src).toContain("resolveVentureCategoryFromQuery")
    expect(src).toContain("VentureCardSkeleton")
    expect(src).toContain("0 resultados")
    expect(read("components/ventures/VenturesEmptyState.tsx")).toContain("Limpiar filtros")
    expect(read("components/ventures/VenturesEmptyState.tsx")).toContain("SuggestVentureCta")
  })

  it("cards con foto densa o placeholder Sin foto", () => {
    const src = read("components/ventures/VentureCard.tsx")
    expect(src).toContain("getVentureCoverPhoto")
    expect(src).toContain("Sin foto")
    expect(src).toContain("aspect-[4/3]")
    expect(src).toContain("getSafetyBadge")
    expect(src).toContain("rounded-[24px]")
    expect(src).toContain("Ver perfil")
    expect(src).not.toContain("ventureInitials(")
    expect(src).not.toContain("placeholderWash")
  })

  it("grid 4 columnas y CTA sugerir visible, no banner de dueño", () => {
    const page = read("app/emprendimientos/EmprendimientosPageContent.tsx")
    const explore = read("components/ventures/VentureExploreSections.tsx")
    const cta = read("components/ventures/SuggestVentureCta.tsx")
    expect(page).toContain("xl:grid-cols-4")
    expect(page).toContain("SuggestVentureCta")
    expect(cta).toContain("/sugerir-emprendimiento")
    expect(cta).toContain("Sugerir emprendimiento")
    expect(explore).toContain("¿Falta un emprendimiento?")
    expect(explore).toContain("SuggestVentureCta")
    expect(explore).not.toContain("Publicar emprendimiento")
    expect(explore).toContain("VENTURE_AR_ZONE_LANDINGS")
    expect(explore).not.toContain("Buzios")
  })

  it("índice SSR pasa marcas iniciales; HTML no espera fetch cliente", () => {
    const page = read("app/emprendimientos/page.tsx")
    const content = read("app/emprendimientos/EmprendimientosPageContent.tsx")
    expect(page).toContain('getApprovedVentures({ limit: "all" })')
    expect(page).toContain("initialVentures")
    expect(page).toContain("VentureCardSkeleton")
    expect(read("lib/ventures-server.ts")).toContain("argentinaVentureMongoFilter")
    expect(read("app/api/ventures/route.ts")).toContain("argentinaVentureMongoFilter")
    expect(content).toContain("initialVentures")
    expect(content).not.toContain("fetchApi")
    expect(content).not.toContain("/api/ventures")
  })

  it("chips tienen pista de scroll en mobile", () => {
    const src = read("app/emprendimientos/EmprendimientosPageContent.tsx")
    expect(src).toContain("Deslizá para ver más categorías")
    expect(src).toContain("scroll-mt-[calc(var(--desktop-nav-clearance)")
    expect(src).toContain("bottom-nav-clearance")
    expect(src).toContain("VENTURE_CATALOG_INTRO")
    expect(read("lib/ventures-server.ts")).toContain("dedicatedVentureMongoFilter")
    expect(read("app/api/ventures/route.ts")).toContain("dedicatedVentureMongoFilter")
  })
})
