import { buildSeoPages, dedupeUrls } from "@/lib/seo/sitemap-pages"
import { getCityBySlug } from "@/lib/seo/cities"
import { getBaseUrl } from "@/lib/base-url"

describe("canonical y geo", () => {
  it("getBaseUrl no termina en slash y en prod fuerza www", () => {
    expect(getBaseUrl().endsWith("/")).toBe(false)
  })

  it("getBaseUrl normaliza apex si NEXT_PUBLIC_BASE_URL viene sin www", () => {
    const prev = process.env.NEXT_PUBLIC_BASE_URL
    process.env.NEXT_PUBLIC_BASE_URL = "https://celimap.com.ar"
    expect(getBaseUrl()).toBe("https://www.celimap.com.ar")
    if (prev === undefined) delete process.env.NEXT_PUBLIC_BASE_URL
    else process.env.NEXT_PUBLIC_BASE_URL = prev
  })

  it("San Miguel de Tucumán ≠ Yerba Buena en seed", () => {
    const tuc = getCityBySlug("san-miguel-de-tucuman")
    const yb = getCityBySlug("yerba-buena")
    expect(tuc).toBeTruthy()
    expect(tuc?.provinceSlug).toBe("tucuman")
    expect(yb).toBeUndefined()
  })

  it("sitemap no incluye ciudad con 0 lugares", () => {
    const pages = buildSeoPages("https://www.celimap.com.ar", [])
    expect(pages.every((p) => !p.url.includes("/sin-gluten/la-plata"))).toBe(true)
  })

  it("sitemap incluye ciudad estratégica con 1 lugar", () => {
    const pages = buildSeoPages("https://www.celimap.com.ar", [
      {
        _id: { toString: () => "1" },
        province: "buenos-aires",
        locality: "la-plata",
        type: "restaurant",
        updatedAt: new Date("2026-01-01"),
      },
    ])
    expect(pages.some((p) => p.url.endsWith("/sin-gluten/la-plata"))).toBe(true)
  })

  it("sitemap no indexa ciudad no estratégica con 1 lugar", () => {
    const pages = buildSeoPages("https://www.celimap.com.ar", [
      {
        _id: { toString: () => "1" },
        province: "cordoba",
        locality: "cordoba",
        type: "restaurant",
        updatedAt: new Date("2026-01-01"),
      },
    ])
    expect(pages.some((p) => p.url.endsWith("/sin-gluten/cordoba"))).toBe(false)
  })

  it("sitemap no indexa tandil con 1 lugar", () => {
    const pages = buildSeoPages("https://www.celimap.com.ar", [
      {
        _id: { toString: () => "1" },
        province: "buenos-aires",
        locality: "tandil",
        type: "restaurant",
        updatedAt: new Date("2026-01-01"),
      },
    ])
    expect(pages.some((p) => p.url.endsWith("/sin-gluten/tandil"))).toBe(false)
  })

  it("dedupeUrls elimina duplicados", () => {
    const out = dedupeUrls([
      { url: "https://www.celimap.com.ar/a", changeFrequency: "weekly", priority: 1 },
      { url: "https://www.celimap.com.ar/a", changeFrequency: "daily", priority: 0.5 },
    ])
    expect(out).toHaveLength(1)
  })
})
