/**
 * @jest-environment node
 */
jest.mock("react", () => {
  const actual = jest.requireActual("react") as typeof import("react")
  return { ...actual, cache: (fn: unknown) => fn }
})
jest.mock("@/lib/mongodb", () => jest.fn().mockResolvedValue(undefined))
jest.mock("@/lib/review-stats-index", () => ({ getReviewStatsFor: jest.fn(async () => new Map()) }))

const mockFind = jest.fn()
const mockCount = jest.fn()
jest.mock("@/models/Place", () => ({
  Place: {
    find: (...a: unknown[]) => mockFind(...a),
    countDocuments: (...a: unknown[]) => mockCount(...a),
  },
}))

import { getPlacesByCity } from "@/lib/seo/places"

function chain() {
  const c = { sort: () => c, skip: () => c, limit: () => c, lean: () => Promise.resolve([]) }
  return c
}

describe("filtro ?barrio= de la landing de ciudad", () => {
  beforeEach(() => {
    mockFind.mockReset().mockImplementation(() => chain())
    mockCount.mockReset()
  })

  it("un barrio del config filtra por el nombre exacto", async () => {
    mockCount.mockResolvedValue(3)
    await getPlacesByCity("cordoba", 1, "nueva córdoba")
    expect(mockFind.mock.calls[0][0].neighborhood).toBe("Nueva Córdoba")
  })

  it("un barrio que viene de la base (no está en el config) también filtra", async () => {
    mockCount.mockResolvedValue(4)
    await getPlacesByCity("cordoba", 1, "Los Boulevares")
    expect(mockFind.mock.calls[0][0].neighborhood).toEqual({ $regex: "^Los Boulevares$", $options: "i" })
  })

  it("escapa el texto: un barrio con caracteres de regex no rompe ni amplía la búsqueda", async () => {
    mockCount.mockResolvedValue(1)
    await getPlacesByCity("cordoba", 1, "Villa (.*)")
    expect(mockFind.mock.calls[0][0].neighborhood.$regex).toBe("^Villa \\(\\.\\*\\)$")
  })

  it("un barrio sin lugares (URL inventada) se ignora y muestra la ciudad", async () => {
    mockCount.mockResolvedValue(0)
    await getPlacesByCity("cordoba", 1, "No Existe")
    expect(mockFind.mock.calls[0][0]).not.toHaveProperty("neighborhood")
  })
})
