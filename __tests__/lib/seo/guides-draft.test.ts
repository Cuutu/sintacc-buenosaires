import { getGuideBySlug, getPublishedGuides, getGuidesRelatedToCity, GUIDES } from "@/lib/seo/guides"
import { isDraftGuidePreviewEnv } from "@/lib/seo/guide-access"
import { decideGuideIndexing } from "@/lib/seo/indexing-rules"

describe("guides draft policy", () => {
  it("todas las guías iniciales son draft (no auto-publish)", () => {
    expect(GUIDES.length).toBeGreaterThan(0)
    expect(GUIDES.every((g) => g.status === "draft")).toBe(true)
    expect(getPublishedGuides()).toEqual([])
  })

  it("getGuidesRelatedToCity no expone drafts", () => {
    const related = getGuidesRelatedToCity("buenos-aires")
    expect(related.every((g) => g.status === "published")).toBe(true)
    expect(related).toEqual([])
  })

  it("draft → noindex", () => {
    const guide = getGuideBySlug("que-significa-100-libre-de-gluten")
    expect(guide?.status).toBe("draft")
    expect(decideGuideIndexing("draft")).toBe("noindex")
  })

  it("isDraftGuidePreviewEnv refleja NODE_ENV/VERCEL_ENV", () => {
    // En jest suele ser test/development — no debe lanzar
    expect(typeof isDraftGuidePreviewEnv()).toBe("boolean")
  })
})
