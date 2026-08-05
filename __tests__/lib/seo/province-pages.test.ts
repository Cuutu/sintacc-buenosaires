import { getProvincePageData, getProvinceCategoryPageData } from "@/lib/seo/province-pages"
import { getPlacesByProvinceSlug, getProvinceLocalities } from "@/lib/seo/places"

// Mocks de DB para tests puros de composición
jest.mock("@/lib/mongodb", () => jest.fn().mockResolvedValue(undefined))
jest.mock("@/models/Review", () => ({ Review: { aggregate: jest.fn().mockResolvedValue([]) } }))
jest.mock("@/models/ContaminationReport", () => ({ ContaminationReport: { aggregate: jest.fn().mockResolvedValue([]) } }))

const mockPlaces = [
  { _id: "1", name: "Lugar MDP", type: "restaurant", types: ["restaurant"], neighborhood: "Centro", province: "buenos-aires", locality: "mar-del-plata", tags: ["100_gf"], safetyLevel: "dedicated_gf", updatedAt: new Date("2024-01-01") },
  { _id: "2", name: "Lugar Córdoba", type: "cafe", types: ["cafe"], neighborhood: "Centro", province: "cordoba", locality: "cordoba", tags: ["opciones_sin_tacc"], safetyLevel: "gf_options", updatedAt: new Date("2024-02-01") },
  { _id: "3", name: "Lugar Córdoba 2", type: "restaurant", types: ["restaurant"], neighborhood: "Nueva Córdoba", province: "cordoba", locality: "cordoba", tags: [], safetyLevel: "unknown", updatedAt: new Date("2024-03-01") },
  { _id: "4", name: "Lugar Río Cuarto", type: "store", types: ["store"], neighborhood: "Centro", province: "cordoba", locality: "rio-cuarto", tags: [], safetyLevel: "unknown", updatedAt: new Date("2024-04-01") },
  { _id: "5", name: "Lugar Río Cuarto 2", type: "restaurant", types: ["restaurant"], neighborhood: "Centro", province: "cordoba", locality: "rio-cuarto", tags: [], safetyLevel: "unknown", updatedAt: new Date("2024-05-01") },
]

function filterPlaces(query: any): any[] {
  return mockPlaces.filter((p) => {
    if (query.province && p.province !== query.province) return false
    if (query.locality && p.locality !== query.locality) return false
    if (query.$or) {
      const type = query.$or[0].type
      if (!(p.type === type || p.types?.includes(type))) return false
    }
    return true
  })
}

jest.mock("@/models/Place", () => ({
  Place: {
    find: jest.fn((query: any) => ({
      sort: () => ({
        limit: (limit: number) => ({
          lean: () => Promise.resolve(filterPlaces(query).slice(0, limit)),
        }),
      }),
    })),
    findOne: jest.fn(() => ({
      sort: () => ({ select: () => ({ lean: () => Promise.resolve({ updatedAt: new Date("2024-05-01") }) }) }),
    })),
    countDocuments: jest.fn((query: any) => Promise.resolve(filterPlaces(query).length)),
    aggregate: jest.fn(() => Promise.resolve([
      { _id: "cordoba", count: 3 },
      { _id: "rio-cuarto", count: 2 },
    ])),
  },
}))

describe("lib/seo/province-pages", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("un lugar de Mar del Plata NO aparece en getPlacesByProvinceSlug('cordoba')", async () => {
    const { places } = await getPlacesByProvinceSlug("cordoba")
    expect(places.some((p) => p.locality === "mar-del-plata")).toBe(false)
    expect(places.every((p) => p.province === "cordoba")).toBe(true)
  })

  it("filtra provincia + categoría correctamente", async () => {
    const { places } = await getPlacesByProvinceSlug("cordoba", { categorySlug: "restaurantes" })
    expect(places.length).toBeGreaterThan(0)
    expect(places.every((p) => p.type === "restaurant" || p.types?.includes("restaurant"))).toBe(true)
  })

  it("no tiene duplicados por _id", async () => {
    const { places } = await getPlacesByProvinceSlug("cordoba")
    const ids = places.map((p) => p._id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("total === places.length solo sin limit; con limit total representa todos", async () => {
    const { places, total } = await getPlacesByProvinceSlug("cordoba", { limit: 2 })
    expect(total).toBe(4) // 4 lugares de cordoba en mock
    expect(places.length).toBe(2)
  })

  it("getProvinceLocalities agrupa por locality y mapea citySlug", async () => {
    const localities = await getProvinceLocalities("cordoba")
    expect(localities.some((l) => l.slug === "cordoba" && l.citySlug === "cordoba")).toBe(true)
    expect(localities.some((l) => l.slug === "rio-cuarto" && l.citySlug === "rio-cuarto")).toBe(true)
  })

  it("getProvincePageData compone datos SSR", async () => {
    const data = await getProvincePageData("cordoba")
    expect(data.province.slug).toBe("cordoba")
    expect(data.total).toBe(4)
    expect(data.dedicatedGfCount).toBeGreaterThanOrEqual(0)
    expect(data.gfOptionsCount).toBeGreaterThanOrEqual(0)
    expect(data.localities.length).toBeGreaterThan(0)
    expect(data.categories.length).toBeGreaterThan(0)
  })

  it("getProvinceCategoryPageData compone datos de categoría", async () => {
    const data = await getProvinceCategoryPageData("cordoba", "restaurantes")
    expect(data.province.slug).toBe("cordoba")
    expect(data.categorySlug).toBe("restaurantes")
    expect(data.total).toBe(2) // 2 restaurantes de cordoba
  })
})