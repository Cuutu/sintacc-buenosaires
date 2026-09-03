import { shouldEnqueuePlaceForResearch } from "@/lib/place-enrichment-eligibility"

describe("shouldEnqueuePlaceForResearch", () => {
  const barePending = {
    name: "Panadería Nueva",
    address: "Calle 1",
    neighborhood: "Palermo",
    type: "other" as const,
    status: "pending" as const,
    photos: [] as string[],
  }

  it("skips queued and running", () => {
    expect(
      shouldEnqueuePlaceForResearch(
        { ...barePending, aiEnrichment: { status: "queued" } },
        { force: true }
      )
    ).toBe(false)
    expect(
      shouldEnqueuePlaceForResearch({
        ...barePending,
        aiEnrichment: { status: "running" },
      })
    ).toBe(false)
  })

  it("never enqueues published places", () => {
    expect(
      shouldEnqueuePlaceForResearch({
        ...barePending,
        status: "approved",
        safetyLevel: undefined,
      })
    ).toBe(false)
    expect(
      shouldEnqueuePlaceForResearch(
        { ...barePending, status: "approved", aiEnrichment: { status: "failed" } },
        { force: true }
      )
    ).toBe(false)
  })

  it("enqueues pending places with thin ficha even if TACC is set", () => {
    expect(
      shouldEnqueuePlaceForResearch({
        ...barePending,
        safetyLevel: "gf_options",
      })
    ).toBe(true)
  })

  it("force re-enqueues done pending places unless already in flight", () => {
    expect(
      shouldEnqueuePlaceForResearch(
        {
          ...barePending,
          safetyLevel: "dedicated_gf",
          contact: { instagram: "@ok" },
          openingHours: "9-18",
          type: "bakery",
          aiEnrichment: { status: "done" },
        },
        { force: true }
      )
    ).toBe(true)
  })
})
