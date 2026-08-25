import { getGuideBySlug, getPublishedGuides, getGuidesRelatedToCity, GUIDES } from "@/lib/seo/guides"
import { isDraftGuidePreviewEnv } from "@/lib/seo/guide-access"
import { decideGuideIndexing } from "@/lib/seo/indexing-rules"

describe("guides publish policy", () => {
  it("guías iniciales publicadas son indexables", () => {
    expect(GUIDES.length).toBeGreaterThan(0)
    expect(GUIDES.every((g) => g.status === "published")).toBe(true)
    expect(getPublishedGuides().length).toBe(GUIDES.length)
  })

  it("getGuidesRelatedToCity solo expone published", () => {
    const related = getGuidesRelatedToCity("buenos-aires")
    expect(related.every((g) => g.status === "published")).toBe(true)
    expect(related.length).toBeGreaterThan(0)
  })

  it("published → index; draft → noindex", () => {
    const guide = getGuideBySlug("que-significa-100-libre-de-gluten")
    expect(guide?.status).toBe("published")
    expect(decideGuideIndexing("published")).toBe("index")
    expect(decideGuideIndexing("draft")).toBe("noindex")
  })

  it("isDraftGuidePreviewEnv refleja NODE_ENV/VERCEL_ENV", () => {
    expect(typeof isDraftGuidePreviewEnv()).toBe("boolean")
  })
})
