import {
  buildPlaceDescription,
  buildPlaceMetadata,
  buildPlaceTitle,
  placeCategoryLine,
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

  it("100% con \"libre de gluten\" en el nombre igual dice sin TACC", () => {
    const title = buildPlaceTitle(namedGlutenFree)
    expect(title).toContain("Libre de Gluten")
    expect(title).toMatch(/Panadería/)
    const afterPipe = title.split("|")[1] ?? ""
    expect(afterPipe).toMatch(/sin TACC/)
    expect(afterPipe).not.toMatch(/100%/)
    expect(title).not.toContain("| CeliMap")
  })

  it("100% con \"Gluten Free\" en el nombre: título, descripción y línea de la ficha dicen sin TACC", () => {
    const painDuJour = {
      name: "Pain du Jour - Gluten Free",
      type: "bakery",
      neighborhood: "Palermo",
      tags: ["100_gf"],
      safetyLevel: "dedicated_gf" as const,
    }
    expect(buildPlaceTitle(painDuJour)).toBe("Pain du Jour - Gluten Free | Panadería sin TACC en Palermo")
    expect(buildPlaceDescription(painDuJour)).toMatch(/^Pain du Jour - Gluten Free: Panadería sin TACC en Palermo\./)
    expect(placeCategoryLine(painDuJour)).toBe("Panadería · sin TACC · Palermo")
  })

  it("100% con \"sin TACC\" en el nombre no lo repite", () => {
    const title = buildPlaceTitle({
      name: "Sin TACC Express",
      type: "cafe",
      neighborhood: "Almagro",
      tags: ["100_gf"],
      safetyLevel: "dedicated_gf",
    })
    expect(title).toBe("Sin TACC Express | Café en Almagro")
  })

  it("con opciones y \"Gluten Free\" en el nombre aclara que son opciones", () => {
    const title = buildPlaceTitle({
      name: "Gluten Free Corner",
      type: "cafe",
      neighborhood: "Boedo",
      tags: ["opciones_sin_tacc"],
      safetyLevel: "gf_options",
    })
    expect(title.split("|")[1]).toMatch(/con opciones sin TACC/)
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

  it("neighborhood CABA stale no gana si address+coords son otra ciudad", () => {
    const title = buildPlaceTitle({
      name: "New Life Gluten Free",
      type: "store",
      neighborhood: "Belgrano",
      locality: "campana",
      province: "buenos-aires",
      address: "Gral. Belgrano 294, B2804 Campana, Provincia de Buenos Aires, Argentina",
      addressText: "Gral. Belgrano 294, B2804 Campana, Provincia de Buenos Aires, Argentina",
      location: { lat: -34.163, lng: -58.959 },
    })
    expect(title).toContain("Campana")
    expect(title).not.toMatch(/en Belgrano/)
  })
})

describe("T2 missing place intacta", () => {
  it("404 metadata sigue noindex sin | CeliMap", () => {
    expect(missingPlaceMetadata.title).toBe("No encontramos este lugar")
    expect(missingPlaceMetadata.robots).toEqual({ index: false, follow: true })
    expect(String(missingPlaceMetadata.title)).not.toContain("| CeliMap")
  })
})
