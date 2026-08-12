import { CELIMAP_DESCRIPTION, CELIMAP_SAME_AS } from "@/lib/seo/brand"

describe("brand identity", () => {
  it("descripción canónica define mapa/guía colaborativa", () => {
    expect(CELIMAP_DESCRIPTION).toMatch(/mapa y guía colaborativa/i)
    expect(CELIMAP_DESCRIPTION).toMatch(/sin TACC/i)
    expect(CELIMAP_DESCRIPTION.toLowerCase()).not.toMatch(/tratamiento médico/)
  })

  it("sameAs solo Instagram oficial confirmado", () => {
    expect(CELIMAP_SAME_AS).toEqual(["https://www.instagram.com/celimap_/"])
  })
})
