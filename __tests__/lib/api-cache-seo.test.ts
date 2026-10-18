/**
 * @jest-environment node
 */
const mockRevalidatePath = jest.fn()
const mockRevalidateTag = jest.fn()
const mockUnstableCache = jest.fn((loader: () => Promise<unknown>) => loader)
jest.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  unstable_cache: (...args: unknown[]) => mockUnstableCache(...(args as [() => Promise<unknown>])),
}))

import { SEO_LANDING_ROUTES, getOrSetApiCache, invalidateApiCache } from "@/lib/api-cache"

describe("invalidateApiCache y las landings con ISR", () => {
  beforeEach(() => jest.clearAllMocks())

  it("una escritura de lugares marca como viejas todas las landings", () => {
    invalidateApiCache(["public:places:", "admin:places:", "admin:counts", "seo:province:"])
    for (const route of SEO_LANDING_ROUTES) {
      expect(mockRevalidatePath).toHaveBeenCalledWith(route, "page")
    }
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sin-gluten-argentina")
    expect(mockRevalidateTag).toHaveBeenCalledWith("public:places")
  })

  it("las invalidaciones que no son de lugares no tocan las landings", () => {
    invalidateApiCache(["admin:counts"])
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it("cubre ciudad, ciudad + categoría, provincia y categoría nacional", () => {
    expect(SEO_LANDING_ROUTES).toEqual(
      expect.arrayContaining([
        "/sin-gluten/[ciudadSlug]",
        "/sin-gluten/[ciudadSlug]/[categoriaSlug]",
        "/sin-gluten/provincia/[provinceSlug]",
        "/categoria/[category]",
      ])
    )
  })

  it("emprendimientos: la caché de /api/ventures usa un tag que la invalidación sí alcanza", async () => {
    await getOrSetApiCache("public:ventures:category=pasteleria", 60_000, async () => [])
    expect(mockUnstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["public:ventures:category=pasteleria"],
      expect.objectContaining({ tags: ["public:ventures"] })
    )
    invalidateApiCache(["public:ventures:", "admin:ventures:", "admin:counts"])
    expect(mockRevalidateTag).toHaveBeenCalledWith("public:ventures")
    expect(mockRevalidateTag).toHaveBeenCalledWith("admin:ventures")
    expect(mockRevalidatePath).toHaveBeenCalledWith("/emprendimientos/[slug]", "page")
  })
})
