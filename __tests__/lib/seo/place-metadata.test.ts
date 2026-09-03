import {
  buildPlaceDescription,
  buildPlaceMetadata,
  buildPlaceTitle,
} from "@/lib/seo/place-metadata"
import { missingPlaceMetadata } from "@/lib/seo/missing-place-metadata"

const dedicatedCafe = {
  _id: "1",
  slug: "gout-caballito-caballito",
  name: "Gout Caballito",
  type: "cafe",
  neighborhood: "Caballito",
  tags: ["100_gf"],
  safetyLevel: "dedicated_gf" as const,
  address: "Av. Rivadavia 5000, Caballito",
}

const optionsCafe = {
  _id: "2",
  slug: "cafe-martinez-boedo",
  name: "Café Martínez",
  type: "cafe",
  neighborhood: "Boedo",
  tags: ["opciones_sin_tacc"],
  safetyLevel: "gf_options" as const,
  address: "Boedo 1234",
}

const namedGlutenFree = {
  _id: "3",
  slug: "la-chiperia-gastronomia-casera-libre-de-gluten",
  name: "La Chipería Gastronomía Casera Libre de Gluten",
  type: "bakery",
  neighborhood: "Palermo",
  tags: ["100_gf"],
  safetyLevel: "dedicated_gf" as const,
}

describe("place metadata titles", () => {
  it("dedicado café Caballito: tipo, sin TACC, barrio; sin | CeliMap", () => {
    const title = buildPlaceTitle(dedicatedCafe)
    expect(title).toContain("Gout Caballito")
    expect(title).toMatch(/Café/)
    expect(title).toMatch(/sin TACC/)
    expect(title).toContain("Caballito")
    expect(title).not.toContain("| CeliMap")
    expect(title).not.toMatch(/100%\s*seguro/i)
    const meta = buildPlaceMetadata(dedicatedCafe)
    expect(meta.openGraph?.title).toBe(title)
    expect(String(meta.openGraph?.title)).not.toContain("| CeliMap")
    expect(String(meta.alternates?.canonical)).toMatch(/\/lugar\/gout-caballito-caballito$/)
  })

  it("opciones: no 100% ni sin gluten dedicado; sí opciones sin TACC", () => {
    const title = buildPlaceTitle(optionsCafe)
    const description = buildPlaceDescription(optionsCafe)
    expect(title).toMatch(/opciones sin TACC/)
    expect(description).toMatch(/opciones sin TACC/)
    expect(title).not.toMatch(/100%/)
    expect(description).not.toMatch(/100%/)
    expect(title).not.toMatch(/sin gluten/i)
    expect(description).not.toMatch(/sin gluten/i)
    expect(title).not.toContain("| CeliMap")
  })

  it("name ya con libre de gluten no dobla oferta", () => {
    const title = buildPlaceTitle(namedGlutenFree)
    expect(title).toContain("Libre de Gluten")
    expect(title).toMatch(/Panadería/)
    const afterPipe = title.split("|")[1] ?? ""
    expect(afterPipe).not.toMatch(/sin TACC/)
    expect(afterPipe).not.toMatch(/100%/)
    expect(title).not.toContain("| CeliMap")
  })

  it("tag opciones gana aunque safetyLevel diga dedicated", () => {
    const title = buildPlaceTitle({
      name: "Café Mixto",
      type: "cafe",
      neighborhood: "Boedo",
      tags: ["opciones_sin_tacc"],
      safetyLevel: "dedicated_gf",
    })
    expect(title).toMatch(/opciones sin TACC/)
    expect(title).not.toMatch(/100%/)
  })
})

describe("T2 missing place intacta", () => {
  it("404 metadata sigue noindex sin | CeliMap", () => {
    expect(missingPlaceMetadata.title).toBe("No encontramos este lugar")
    expect(missingPlaceMetadata.robots).toEqual({ index: false, follow: true })
    expect(String(missingPlaceMetadata.title)).not.toContain("| CeliMap")
  })
})
