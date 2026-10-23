/**
 * @jest-environment node
 */
import {
  LIST_CARD_PREVIEW_PLACES,
  formatPlacesCount,
  listPlacesCount,
  trimListForCard,
} from "@/lib/lists/card-places"

const mockLean = jest.fn()
const mockFind = jest.fn()
const mockPopulateQuery = jest.fn()

jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/models/Place", () => ({}))
jest.mock("@/models/User", () => ({}))
jest.mock("@/models/List", () => {
  const chain = {
    sort: () => chain,
    limit: () => chain,
    populate: (...args: unknown[]) => {
      mockPopulateQuery(...args)
      return chain
    },
    lean: () => mockLean(),
  }
  return {
    List: {
      find: (...args: unknown[]) => {
        mockFind(...args)
        return chain
      },
    },
  }
})

import { findCommunityLists } from "@/lib/lists/get-public-community-lists"

const ids = (n: number) => Array.from({ length: n }, (_, i) => `place${i + 1}`)

describe("trimListForCard", () => {
  it("cuenta todos los lugares y deja sólo los primeros para la foto", () => {
    const list = trimListForCard({ name: "Córdoba", placeIds: ids(12) })
    expect(list.placesCount).toBe(12)
    expect(list.placeIds).toEqual(ids(LIST_CARD_PREVIEW_PLACES))
    expect(list.name).toBe("Córdoba")
  })

  it("no rompe con listas cortas o sin lugares", () => {
    expect(trimListForCard({ placeIds: ids(1) })).toMatchObject({ placesCount: 1, placeIds: ids(1) })
    expect(trimListForCard({ placeIds: [] })).toMatchObject({ placesCount: 0, placeIds: [] })
    expect(trimListForCard({})).toMatchObject({ placesCount: 0, placeIds: [] })
  })

  it("no modifica la lista original", () => {
    const original = { placeIds: ids(6) }
    trimListForCard(original)
    expect(original.placeIds).toHaveLength(6)
  })
})

describe("formatPlacesCount", () => {
  it("singular y plural", () => {
    expect(formatPlacesCount(0)).toBe("0 lugares")
    expect(formatPlacesCount(1)).toBe("1 lugar")
    expect(formatPlacesCount(12)).toBe("12 lugares")
  })
})

describe("listPlacesCount", () => {
  it("usa placesCount si viene; si no, cuenta los lugares cargados", () => {
    expect(listPlacesCount({ placesCount: 8, placeIds: ids(4) })).toBe(8)
    expect(listPlacesCount({ placeIds: [...ids(3), null] })).toBe(3)
    expect(listPlacesCount({})).toBe(0)
  })
})

describe("findCommunityLists", () => {
  beforeEach(() => jest.clearAllMocks())

  it("cuenta los lugares publicados (como el detalle) y carga 4 para la foto", async () => {
    // El populate con match ya trae solo los publicados.
    mockLean.mockResolvedValue([
      { _id: "a", name: "Lugares en Córdoba", placeIds: ids(8).map((id) => ({ _id: id })), placeNotes: [] },
      { _id: "b", name: "Palermo", placeIds: ids(1).map((id) => ({ _id: id })), placeNotes: [] },
    ])

    const lists = await findCommunityLists(20)

    expect(mockPopulateQuery).toHaveBeenCalledWith(
      expect.objectContaining({ path: "placeIds", match: { status: "approved" } })
    )
    expect(lists[0]).toMatchObject({ placesCount: 8, isPublic: true })
    expect(lists[0].placeIds).toHaveLength(4)
    expect(lists[1]).toMatchObject({ placesCount: 1 })
    // Sigue sin exponer las notas en el listado público.
    expect(lists[0]).not.toHaveProperty("placeNotes")
  })
})
