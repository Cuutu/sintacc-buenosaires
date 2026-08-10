import robots from "@/app/robots"
import { publicListsQuery } from "@/lib/lists/access"
import { LIST_VISIBILITY } from "@/lib/lists/constants"

describe("SEO listas privadas", () => {
  it("robots disallow /listas/privadas", () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    for (const rule of rules) {
      const disallow = rule?.disallow
      const list = Array.isArray(disallow) ? disallow : [disallow]
      expect(list).toContain("/listas/privadas")
    }
  })

  it("publicListsQuery no incluye PRIVATE_LINK", () => {
    const q = publicListsQuery()
    expect(q.isPublic).toBe(true)
    // Las PRIVATE_LINK tienen isPublic=false → quedan fuera
    expect(LIST_VISIBILITY.PRIVATE_LINK).toBe("PRIVATE_LINK")
  })
})
