/**
 * @jest-environment node
 */
const mockFind = jest.fn()
const mockBulkWrite = jest.fn()
const mockUpdateMany = jest.fn()
const mockUpdateOne = jest.fn()
jest.mock("@/lib/mongodb", () => jest.fn(() => Promise.resolve()))
jest.mock("@vercel/functions", () => ({ waitUntil: jest.fn() }))
jest.mock("@/lib/google-place-sync", () => ({
  placeNeedsGoogleSync: (p: { googleSnapshot?: { syncedAt?: unknown } }) => !p.googleSnapshot?.syncedAt,
  syncPlaceGoogleReviews: jest.fn(),
}))
jest.mock("@/lib/place-enrichment-queue", () => ({ isValidInternalJobRequest: jest.fn() }))
jest.mock("@/models/Place", () => ({
  Place: {
    find: (...a: unknown[]) => mockFind(...a),
    bulkWrite: (...a: unknown[]) => mockBulkWrite(...a),
    updateMany: (...a: unknown[]) => mockUpdateMany(...a),
    updateOne: (...a: unknown[]) => mockUpdateOne(...a),
  },
}))

import { enqueueGoogleSyncPlaces } from "@/lib/google-sync-queue"

function chain(result: unknown[]) {
  const c = { select: () => c, sort: () => c, limit: () => c, lean: () => Promise.resolve(result) }
  return c
}

describe("enqueueGoogleSyncPlaces", () => {
  beforeEach(() => jest.clearAllMocks())

  it("completa los googlePlaceId con un solo bulkWrite y encola con un solo updateMany", async () => {
    mockFind
      .mockReturnValueOnce(
        chain([
          { _id: "a", aiEnrichment: { googlePlaceId: " gp-a " } },
          { _id: "b", aiEnrichment: { googlePlaceId: "" } },
        ])
      )
      .mockReturnValueOnce(
        chain([
          { _id: "p1", name: "Sin snapshot" },
          { _id: "p2", name: "Ya sincronizado", googleSnapshot: { syncedAt: new Date() } },
          { _id: "p3", name: "En cola", googleSync: { status: "queued" } },
          { _id: "p4", name: "Otro sin snapshot" },
        ])
      )

    const result = await enqueueGoogleSyncPlaces()

    expect(result).toEqual({ queued: 2, skipped: 2 })
    expect(mockBulkWrite).toHaveBeenCalledTimes(1)
    expect(mockBulkWrite.mock.calls[0][0]).toEqual([
      { updateOne: { filter: { _id: "a" }, update: { $set: { googlePlaceId: "gp-a" } } } },
    ])
    expect(mockUpdateMany).toHaveBeenCalledTimes(1)
    expect(mockUpdateMany.mock.calls[0][0]).toEqual({ _id: { $in: ["p1", "p4"] } })
    expect(mockUpdateMany.mock.calls[0][1].$set.googleSync.status).toBe("queued")
    expect(mockUpdateOne).not.toHaveBeenCalled()
  })

  it("sin nada para hacer no escribe", async () => {
    mockFind.mockReturnValueOnce(chain([])).mockReturnValueOnce(chain([]))
    await enqueueGoogleSyncPlaces()
    expect(mockBulkWrite).not.toHaveBeenCalled()
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })
})
