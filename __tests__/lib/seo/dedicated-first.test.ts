/**
 * @jest-environment node
 */
jest.mock("react", () => {
  const actual = jest.requireActual("react") as typeof import("react")
  return { ...actual, cache: (fn: unknown) => fn }
})
jest.mock("@/lib/mongodb", () => jest.fn().mockResolvedValue(undefined))
jest.mock("@/lib/review-stats-index", () => ({ getReviewStatsFor: jest.fn(async () => new Map()) }))

type Row = { _id: string; name: string; type: string; neighborhood: string; tags: string[]; safetyLevel: string }

/** 30 lugares de Córdoba, ya ordenados del más nuevo al más viejo: 10 son 100%, intercalados. */
const ROWS: Row[] = Array.from({ length: 30 }, (_, i) => {
  const dedicated = i % 3 === 2
  return {
    _id: `p${String(i).padStart(2, "0")}`,
    name: `${dedicated ? "100" : "opc"}-${i}`,
    type: "restaurant",
    neighborhood: "Centro",
    tags: dedicated ? ["100_gf"] : ["opciones_sin_tacc"],
    safetyLevel: dedicated ? "dedicated_gf" : "gf_options",
  }
})

function matches(row: Row, query: any): boolean {
  const { inferSafetyLevel } = jest.requireActual("@/components/featured/featured-utils")
  const dedicated = inferSafetyLevel(row) === "dedicated_gf"
  return (query.$and ?? []).every((c: any) => (c.$nor ? !dedicated : dedicated))
}

jest.mock("@/models/Place", () => ({
  Place: {
    countDocuments: jest.fn(async (query: any) => ROWS.filter((r) => matches(r, query)).length),
    find: jest.fn((query: any) => {
      const page = (skip: number) => ({
        limit: (n: number) => ({ lean: async () => ROWS.filter((r) => matches(r, query)).slice(skip, skip + n) }),
      })
      return { sort: () => ({ ...page(0), skip: (n: number) => page(n) }) }
    }),
  },
}))

import { getPlacesByCity } from "@/lib/seo/places"

describe("landing de ciudad: 100% sin TACC primero", () => {
  it("la página 1 arranca con los 10 lugares 100% y completa con los más nuevos con opciones", async () => {
    const { places, total, pages } = await getPlacesByCity("cordoba", 1)
    expect(total).toBe(30)
    expect(pages).toBe(2)
    expect(places).toHaveLength(24)
    expect(places.slice(0, 10).every((p) => p.name.startsWith("100-"))).toBe(true)
    expect(places.slice(10).every((p) => p.name.startsWith("opc-"))).toBe(true)
    expect(places[10].name).toBe("opc-0")
  })

  it("la página 2 sigue donde terminó la 1, sin repetir ni saltear", async () => {
    const first = await getPlacesByCity("cordoba", 1)
    const second = await getPlacesByCity("cordoba", 2)
    expect(second.places).toHaveLength(6)
    expect(second.places.every((p) => p.name.startsWith("opc-"))).toBe(true)
    const ids = [...first.places, ...second.places].map((p) => p._id)
    expect(new Set(ids).size).toBe(30)
  })
})
