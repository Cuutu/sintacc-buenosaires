import { shouldEnqueuePlaceForResearch } from "@/lib/place-enrichment-eligibility"

describe("shouldEnqueuePlaceForResearch", () => {
  const barePending = {
    name: "Panadería Nueva",
    address: "Calle 1",
    neighborhood: "Palermo",
    type: "other" as const,
    photos: [] as string[],
  }

  it("skips queued and running", () => {
    expect(
      shouldEnqueuePlaceForResearch(
        { ...barePending, aiEnrichment: { status: "queued" } },
        { catalog: "pending", force: true }
      )
    ).toBe(false)
    expect(
      shouldEnqueuePlaceForResearch(
        { ...barePending, aiEnrichment: { status: "running" } },
        { catalog: "approved" }
      )
    ).toBe(false)
  })

  it("enqueues published places missing TACC", () => {
    expect(shouldEnqueuePlaceForResearch(barePending, { catalog: "approved" })).toBe(true)
    expect(
      shouldEnqueuePlaceForResearch(
        { ...barePending, safetyLevel: "gf_options" },
        { catalog: "approved" }
      )
    ).toBe(false)
  })

  it("enqueues pending places with thin ficha even if TACC is set", () => {
    expect(
      shouldEnqueuePlaceForResearch(
        { ...barePending, safetyLevel: "gf_options" },
        { catalog: "pending" }
      )
    ).toBe(true)
  })

  it("force re-enqueues done places unless already in flight", () => {
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
