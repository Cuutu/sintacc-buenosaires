/**
 * @jest-environment node
 *
 * /lugar/<slug-viejo>: el loader encuentra el lugar por previousSlugs (la ficha
 * después redirige 301 al slug actual).
 */
jest.mock("react", () => ({ ...jest.requireActual("react"), cache: <T,>(fn: T) => fn }))
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn(async () => undefined) }))

const docs = [
  { _id: "64b000000000000000000001", slug: "van-dyke-villa-crespo", previousSlugs: ["van-dyke-palermo"], status: "approved" },
  { _id: "64b000000000000000000002", slug: "oculto", previousSlugs: ["oculto-viejo"], status: "pending" },
]

const findOne = jest.fn((query: Record<string, unknown>) => {
  const match = docs.find((d) => {
    if (query.status && d.status !== query.status) return false
    if ("slug" in query) return d.slug === query.slug
    if ("previousSlugs" in query) return d.previousSlugs.includes(query.previousSlugs as string)
    if ("_id" in query) return String(d._id) === String(query._id)
    return false
  })
  return { select: () => ({ lean: async () => match ?? null }) }
})

jest.mock("@/models/Place", () => ({ Place: { findOne: (q: Record<string, unknown>) => findOne(q) } }))

import { getApprovedPlaceByRouteParam } from "@/lib/place-route"

describe("getApprovedPlaceByRouteParam con slugs viejos", () => {
  beforeEach(() => findOne.mockClear())

  it("el slug actual se encuentra directo (una sola consulta)", async () => {
    const place = await getApprovedPlaceByRouteParam("van-dyke-villa-crespo")
    expect(place?.slug).toBe("van-dyke-villa-crespo")
    expect(findOne).toHaveBeenCalledTimes(1)
  })

  it("el slug viejo devuelve el lugar con su slug actual", async () => {
    const place = await getApprovedPlaceByRouteParam("van-dyke-palermo")
    expect(place?.slug).toBe("van-dyke-villa-crespo")
    expect(findOne).toHaveBeenLastCalledWith({ previousSlugs: "van-dyke-palermo", status: "approved" })
  })

  it("un lugar despublicado no aparece ni por su slug viejo", async () => {
    expect(await getApprovedPlaceByRouteParam("oculto-viejo")).toBeNull()
  })

  it("un slug que no existe sigue dando null (404)", async () => {
    expect(await getApprovedPlaceByRouteParam("no-existe")).toBeNull()
  })
})
