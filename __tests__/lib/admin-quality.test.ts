import {
  buildAttentionItems,
  buildPriorityItems,
  computeBaseQualityScore,
  daysSince,
} from "@/lib/admin-quality"
import type { AdminCounts } from "@/lib/admin-ops"

const base: AdminCounts = {
  suggestionsPending: 0,
  ventureSuggestionsPending: 0,
  contactsTotal: 0,
  contactsPending: 0,
  placesTotal: 100,
  placesApproved: 100,
  placesNoPhoto: 0,
  placesNoHours: 0,
  placesNoInstagram: 0,
  placesNoPhone: 0,
  placesNoWeb: 0,
  placesNoDescription: 0,
  placesNoCoords: 0,
  placesIncomplete: 0,
  reviewsHidden: 0,
  featuredCount: 0,
}

describe("admin quality score", () => {
  it("devuelve null si no hay publicados", () => {
    expect(computeBaseQualityScore({ ...base, placesApproved: 0 })).toBeNull()
  })

  it("da 100 si no hay huecos", () => {
    expect(computeBaseQualityScore(base)).toBe(100)
  })

  it("baja el score con huecos reales", () => {
    expect(
      computeBaseQualityScore({
        ...base,
        placesNoPhoto: 100,
      })
    ).toBe(83)
  })

  it("arma atencion y prioridad desde counts", () => {
    const counts = { ...base, placesNoInstagram: 12, placesNoHours: 4 }
    const attention = buildAttentionItems(counts)
    expect(attention.find((row) => row.id === "instagram")?.count).toBe(12)
    expect(attention.find((row) => row.id === "instagram")?.href).toContain("missing=instagram")
    expect(attention.find((row) => row.id === "instagram")?.href).toContain("status=approved")
    const priority = buildPriorityItems(counts)
    expect(priority[0]?.title).toContain("Instagram")
    expect(priority[0]?.count).toBe(12)
  })

  it("prioriza lugares populares con reseñas Google si existen", () => {
    const priority = buildPriorityItems(base, { missingHours: 7, missingPhoto: 0 })
    expect(priority[0]?.id).toBe("popular-hours")
    expect(priority[0]?.count).toBe(7)
  })

  it("calcula dias", () => {
    const iso = new Date(Date.now() - 3 * 86400000).toISOString()
    expect(daysSince(iso)).toBe(3)
    expect(daysSince(undefined)).toBeNull()
  })
})
