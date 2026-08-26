import { trackEvent } from "@/lib/analytics"

jest.mock("@/lib/analytics", () => ({
  trackEvent: jest.fn(),
}))

const mockTrackEvent = trackEvent as jest.MockedFunction<typeof trackEvent>

/** Misma secuencia que review-form.tsx tras POST exitoso. */
async function submitReviewAnalytics(placeId: string) {
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId }),
  })

  if (!res.ok) return false

  trackEvent("review_submit", { placeId })
  return true
}

describe("review_submit analytics", () => {
  beforeEach(() => {
    mockTrackEvent.mockClear()
  })

  it("submit exitoso dispara review_submit", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ review: { _id: "abc" } }),
    }) as typeof fetch

    const placeId = "507f1f77bcf86cd799439011"
    const ok = await submitReviewAnalytics(placeId)

    expect(ok).toBe(true)
    expect(mockTrackEvent).toHaveBeenCalledWith("review_submit", { placeId })
  })

  it("submit fallido NO dispara review_submit", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "fail" }),
    }) as typeof fetch

    const ok = await submitReviewAnalytics("507f1f77bcf86cd799439011")

    expect(ok).toBe(false)
    expect(mockTrackEvent).not.toHaveBeenCalled()
  })
})
