/**
 * @jest-environment node
 */
const mockReviewAggregate = jest.fn()
const mockReportAggregate = jest.fn()
jest.mock("@/lib/mongodb", () => jest.fn(() => Promise.resolve()))
jest.mock("@/models/Review", () => ({ Review: { aggregate: (...a: unknown[]) => mockReviewAggregate(...a) } }))
jest.mock("@/models/ContaminationReport", () => ({
  ContaminationReport: { aggregate: (...a: unknown[]) => mockReportAggregate(...a) },
}))
const mockCacheKeys: string[] = []
jest.mock("@/lib/api-cache", () => ({
  getOrSetApiCache: (key: string, _ttl: number, loader: () => Promise<unknown>) => {
    mockCacheKeys.push(key)
    return loader()
  },
}))

import { getReviewStatsFor } from "@/lib/review-stats-index"

describe("getReviewStatsFor", () => {
  beforeEach(() => {
    mockCacheKeys.length = 0
    mockReviewAggregate.mockResolvedValue([
      { _id: "a", avg: 4.25, n: 4 },
      { _id: "b", avg: 3, n: 1 },
    ])
    mockReportAggregate.mockResolvedValue([
      { _id: "b", n: 2 },
      { _id: "c", n: 1 },
    ])
  })

  it("arma las stats de cada lugar desde una sola entrada de caché", async () => {
    const stats = await getReviewStatsFor(["a", "b", "c", "d"])
    expect(mockCacheKeys).toEqual(["public:review-stats"])
    expect(stats.get("a")).toEqual({ avgRating: 4.3, totalReviews: 4, contaminationReportsCount: 0 })
    expect(stats.get("b")).toEqual({ avgRating: 3, totalReviews: 1, contaminationReportsCount: 2 })
    expect(stats.get("c")).toEqual({ avgRating: 0, totalReviews: 0, contaminationReportsCount: 1 })
    expect(stats.get("d")).toEqual({ avgRating: 0, totalReviews: 0, contaminationReportsCount: 0 })
  })

  it("solo cuenta reseñas y reportes visibles", async () => {
    await getReviewStatsFor(["a"])
    expect(mockReviewAggregate.mock.calls[0][0][0]).toEqual({ $match: { status: "visible" } })
    expect(mockReportAggregate.mock.calls[0][0][0]).toEqual({ $match: { status: "visible" } })
  })

  it("sin lugares no consulta nada", async () => {
    expect((await getReviewStatsFor([])).size).toBe(0)
    expect(mockCacheKeys).toEqual([])
  })
})
