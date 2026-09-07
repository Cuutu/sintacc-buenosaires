import {
  matchesVentureSearch,
  resolveVentureCategoryFromQuery,
  getMatchingVentureCategories,
} from "@/lib/venture-search"

const pan = {
  name: "Pan de Barrio",
  zone: "CABA",
  category: "panificados",
  modalities: ["delivery"],
}

const vianda = {
  name: "Lunch Celíaco",
  zone: "Córdoba",
  category: "viandas",
}

describe("resolveVentureCategoryFromQuery", () => {
  it("pan resuelve a panificados (único)", () => {
    expect(resolveVentureCategoryFromQuery("pan")).toBe("panificados")
    expect(resolveVentureCategoryFromQuery("Panificados")).toBe("panificados")
  })

  it("via resuelve a viandas", () => {
    expect(resolveVentureCategoryFromQuery("via")).toBe("viandas")
  })

  it("pa no es único (panificados + pastelería)", () => {
    expect(resolveVentureCategoryFromQuery("pa")).toBeNull()
    expect(getMatchingVentureCategories("pa").sort()).toEqual(["panificados", "pasteleria"])
  })

  it("query corta < 2 no resuelve", () => {
    expect(resolveVentureCategoryFromQuery("p")).toBeNull()
  })
})

describe("matchesVentureSearch", () => {
  it("matchea categoría panificados con pan", () => {
    expect(matchesVentureSearch(pan, "pan")).toBe(true)
    expect(matchesVentureSearch(vianda, "pan")).toBe(false)
  })

  it("matchea nombre y zona", () => {
    expect(matchesVentureSearch(pan, "barrio")).toBe(true)
    expect(matchesVentureSearch(pan, "caba")).toBe(true)
  })
})
