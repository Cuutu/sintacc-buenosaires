import robots from "@/app/robots"
import { CANONICAL_ORIGIN, getBaseUrl } from "@/lib/base-url"

describe("robots.txt sitemap reference", () => {
  it("sitemap usa origen www canónico", () => {
    const prev = process.env.NEXT_PUBLIC_BASE_URL
    process.env.NEXT_PUBLIC_BASE_URL = "https://celimap.com.ar"
    expect(getBaseUrl()).toBe(CANONICAL_ORIGIN)
    const conf = robots()
    expect(conf.sitemap).toBe(`${CANONICAL_ORIGIN}/sitemap.xml`)
    if (prev === undefined) delete process.env.NEXT_PUBLIC_BASE_URL
    else process.env.NEXT_PUBLIC_BASE_URL = prev
  })
})
