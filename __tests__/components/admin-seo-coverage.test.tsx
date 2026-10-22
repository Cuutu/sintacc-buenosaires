/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server"
import { AdminSeoCoverage, coveragePercent, formatCoverage } from "@/components/admin/AdminSeoCoverage"
import type { SeoMetric } from "@/lib/admin-seo"

describe("SEO: cobertura en porcentaje", () => {
  it("redondea sin mentir en los bordes", () => {
    expect(formatCoverage(1, 2451)).toBe("menos de 1 %")
    expect(formatCoverage(0, 2451)).toBe("0 %")
    expect(formatCoverage(2451, 2451)).toBe("100 %")
    expect(formatCoverage(2450, 2451)).toBe("99 %")
    expect(formatCoverage(1225, 2451)).toBe("50 %")
    expect(formatCoverage(3, 0)).toBe("—")
    expect(coveragePercent(1, 2451)).toBe(1)
    expect(coveragePercent(0, 10)).toBe(0)
  })

  it("muestra 'X de Y', el % y una barra; lo que no tiene total queda como número", () => {
    const ready: SeoMetric[] = [
      { id: "titles", label: "Fichas con meta title", value: 1, total: 2451, href: "/admin/lugares", state: "ready", note: "n" },
      { id: "places", label: "Lugares publicados", value: 2451, state: "ready", note: "n" },
    ]
    const html = renderToStaticMarkup(<AdminSeoCoverage ready={ready} pending={[]} />)
    expect(html).toContain("1 de 2.451")
    expect(html).toContain("menos de 1 %")
    expect(html).toMatch(/role="progressbar"[^>]*aria-label="Fichas con meta title"/)
    expect(html).toMatch(/data-testid="seo-places"[^>]*>2\.451</)
  })
})
