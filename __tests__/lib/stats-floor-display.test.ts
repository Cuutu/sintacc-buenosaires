import {
  aggregateReviewCounts,
  sanitizeGoogleUserRatingCount,
} from "@/lib/stats/aggregate-reviews"
import { floorDisplayCount } from "@/lib/stats/floor-display-count"

describe("floorDisplayCount", () => {
  it("964 → +900", () => {
    expect(floorDisplayCount(964)?.formatted).toBe("+900")
  })

  it("1243 → +1.200", () => {
    expect(floorDisplayCount(1243)?.formatted).toBe("+1.200")
  })

  it("137 → +100", () => {
    expect(floorDisplayCount(137)?.formatted).toBe("+100")
  })

  it("valores < 100 exactos sin +", () => {
    expect(floorDisplayCount(87)?.formatted).toBe("87")
    expect(floorDisplayCount(42)?.showPlus).toBe(false)
    expect(floorDisplayCount(0)?.formatted).toBe("0")
  })

  it("reseñas grandes", () => {
    expect(floorDisplayCount(1286)?.formatted).toBe("+1.200")
    expect(floorDisplayCount(18430)?.formatted).toBe("+18.000")
    expect(floorDisplayCount(125700)?.formatted).toBe("+125.000")
  })

  it("nulos e inválidos → null", () => {
    expect(floorDisplayCount(null)).toBeNull()
    expect(floorDisplayCount(undefined)).toBeNull()
    expect(floorDisplayCount(Number.NaN)).toBeNull()
    expect(floorDisplayCount(-3)).toBeNull()
    expect(floorDisplayCount("900" as unknown)).toBeNull()
  })
})

describe("aggregateReviewCounts", () => {
  it("suma CeliMap + Google", () => {
    expect(aggregateReviewCounts({ celimapCount: 6, googleCount: 1280 })).toEqual({
      celimap: 6,
      google: 1280,
      total: 1286,
    })
  })

  it("ignora inválidos", () => {
    expect(aggregateReviewCounts({ celimapCount: null, googleCount: 50 })).toEqual({
      celimap: 0,
      google: 50,
      total: 50,
    })
    expect(
      aggregateReviewCounts({ celimapCount: -1, googleCount: Number.NaN })
    ).toEqual({
      celimap: 0,
      google: 0,
      total: 0,
    })
  })

  it("sanitizeGoogleUserRatingCount", () => {
    expect(sanitizeGoogleUserRatingCount(12.9)).toBe(12)
    expect(sanitizeGoogleUserRatingCount(-2)).toBe(0)
    expect(sanitizeGoogleUserRatingCount(null)).toBe(0)
  })
})
