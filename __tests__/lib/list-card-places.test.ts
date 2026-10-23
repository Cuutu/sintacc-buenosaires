/**
 * @jest-environment node
 */
import {
  LIST_CARD_PREVIEW_PLACES,
  formatPlacesCount,
  trimListForCard,
} from "@/lib/lists/card-places"

const mockLean = jest.fn()
const mockPopulateDocs = jest.fn()
const mockFind = jest.fn()

jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/models/Place", () => ({}))
jest.mock("@/models/User", () => ({}))
jest.mock("@/models/List", () => {
  const chain = {
    sort: () => chain,
    limit: () => chain,
    populate: () => chain,
    lean: () => mockLean(),
  }
  return {
    List: {
      find: (...args: unknown[]) => {
        mockFind(...args)
        return chain
      },
      populate: (...args: unknown[]) => mockPopulateDocs(...args),
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

describe("findCommunityLists", () => {
  beforeEach(() => jest.clearAllMocks())

  it("el conteo sale de la lista entera aunque se carguen 4 lugares", async () => {
    mockLean.mockResolvedValue([
      { _id: "a", name: "Lista para una salida!", placeIds: ids(15), placeNotes: [] },
      { _id: "b", name: "Palermo", placeIds: ids(1), placeNotes: [] },
    ])
    mockPopulateDocs.mockImplementation(async (docs: Array<{ placeIds: string[] }>) =>
      docs.map((d) => ({ ...d, placeIds: d.placeIds.map((id) => ({ _id: id, name: id })) }))
    )

    const lists = await findCommunityLists(20)

    // Al populate le llegan sólo los primeros ids (no toda la lista).
    const [docs, options] = mockPopulateDocs.mock.calls[0]
    expect(docs[0].placeIds).toEqual(ids(4))
    expect(options).toMatchObject({ path: "placeIds" })
    expect(options.options?.limit).toBeUndefined()

    expect(lists[0]).toMatchObject({ placesCount: 15, isPublic: true })
    expect(lists[0].placeIds).toHaveLength(4)
    expect(lists[1]).toMatchObject({ placesCount: 1 })
    // Sigue sin exponer las notas en el listado público.
    expect(lists[0]).not.toHaveProperty("placeNotes")
  })
})
