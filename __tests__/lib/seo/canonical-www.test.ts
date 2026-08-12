/**
 * @jest-environment node
 */
import {
  CANONICAL_ORIGIN,
  getBaseUrl,
  normalizeCanonicalOrigin,
  absoluteUrl,
} from "@/lib/base-url"
import {
  buildWwwRedirectUrl,
  isApexCelimapHost,
  resolveTopSinGlutenRedirect,
} from "@/lib/seo/canonical-redirects"
import { buildSeoPages, type SitemapPlace } from "@/lib/seo/sitemap-pages"
import { staticPageLastModified } from "@/lib/seo/static-lastmod"
import { getCityDescription } from "@/lib/seo/templates"
import { getPlacePath } from "@/lib/place-url"

function assertHttpsWww(url: string) {
  expect(url.startsWith("https://www.celimap.com.ar")).toBe(true)
  expect(url).not.toMatch(/^http:\/\//)
  expect(url).not.toContain("http://www/")
  // Rechaza host truncado tipo https://www/ o http://www/
  expect(url).not.toMatch(/^https?:\/\/www\/?([?#]|$)/)
  expect(CANONICAL_ORIGIN).toBe("https://www.celimap.com.ar")
}

describe("canonical www origin", () => {
  const prevBase = process.env.NEXT_PUBLIC_BASE_URL

  afterEach(() => {
    if (prevBase === undefined) delete process.env.NEXT_PUBLIC_BASE_URL
    else process.env.NEXT_PUBLIC_BASE_URL = prevBase
  })

  it("CANONICAL_ORIGIN es exactamente https://www.celimap.com.ar", () => {
    expect(CANONICAL_ORIGIN).toBe("https://www.celimap.com.ar")
    expect(CANONICAL_ORIGIN).not.toBe("http://www.celimap.com.ar")
    expect(CANONICAL_ORIGIN).not.toContain("http://www/")
  })

  it("normalizeCanonicalOrigin fuerza https+www desde apex/http", () => {
    expect(normalizeCanonicalOrigin("https://celimap.com.ar")).toBe(CANONICAL_ORIGIN)
    expect(normalizeCanonicalOrigin("http://celimap.com.ar/")).toBe(CANONICAL_ORIGIN)
    expect(normalizeCanonicalOrigin("http://www.celimap.com.ar")).toBe(CANONICAL_ORIGIN)
    expect(normalizeCanonicalOrigin("https://www.celimap.com.ar")).toBe(CANONICAL_ORIGIN)
    expect(normalizeCanonicalOrigin("celimap.com.ar")).toBe(CANONICAL_ORIGIN)
  })

  it("getBaseUrl corrige NEXT_PUBLIC_BASE_URL sin www o con http", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://celimap.com.ar"
    expect(getBaseUrl()).toBe(CANONICAL_ORIGIN)
    process.env.NEXT_PUBLIC_BASE_URL = "http://www.celimap.com.ar"
    expect(getBaseUrl()).toBe(CANONICAL_ORIGIN)
  })

  it("absoluteUrl home y path", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://celimap.com.ar"
    assertHttpsWww(absoluteUrl("/"))
    assertHttpsWww(absoluteUrl("/sin-gluten/la-plata"))
  })

  it("canonical de ciudad usa www https", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "https://celimap.com.ar"
    const cityCanon = `${getBaseUrl()}/sin-gluten/la-plata`
    assertHttpsWww(cityCanon)
    expect(getCityDescription({ name: "La Plata" } as never)).not.toMatch(/verificados/i)
  })

  it("canonical de lugar usa www https", () => {
    process.env.NEXT_PUBLIC_BASE_URL = "http://celimap.com.ar"
    const path = getPlacePath({
      _id: "507f1f77bcf86cd799439011",
      slug: "ejemplo",
      type: "restaurant",
      neighborhood: "Centro",
    } as never)
    assertHttpsWww(`${getBaseUrl()}${path}`)
  })
})

describe("apex → www redirect helpers", () => {
  it("detecta apex host", () => {
    expect(isApexCelimapHost("celimap.com.ar")).toBe(true)
    expect(isApexCelimapHost("www.celimap.com.ar")).toBe(false)
    expect(isApexCelimapHost("celimap.com.ar:443")).toBe(true)
  })

  it("buildWwwRedirectUrl = https://www.celimap.com.ar + path/query (nunca http://www/)", () => {
    const home = buildWwwRedirectUrl({ pathname: "/" })
    expect(home).toBe("https://www.celimap.com.ar")
    assertHttpsWww(home)

    const withPath = buildWwwRedirectUrl({
      pathname: "/sin-gluten/la-plata",
      search: "?page=2",
    })
    expect(withPath).toBe("https://www.celimap.com.ar/sin-gluten/la-plata?page=2")
    assertHttpsWww(withPath)

    expect(withPath).not.toMatch(/http:\/\/www\//)
    expect(withPath).not.toMatch(/^http:\/\//)
  })
})

describe("top-sin-gluten redirects", () => {
  it("flat y nested resuelven a /sin-gluten/[ciudad]", () => {
    expect(resolveTopSinGlutenRedirect("/top-sin-gluten-la-plata")).toBe(
      "/sin-gluten/la-plata"
    )
    expect(resolveTopSinGlutenRedirect("/top-sin-gluten/ciudad/cordoba")).toBe(
      "/sin-gluten/cordoba"
    )
    expect(resolveTopSinGlutenRedirect("/top-sin-gluten-san-miguel-de-tucuman")).toBe(
      "/sin-gluten/san-miguel-de-tucuman"
    )
    expect(resolveTopSinGlutenRedirect("/sin-gluten/la-plata")).toBeNull()
    expect(resolveTopSinGlutenRedirect("/mapa")).toBeNull()
  })

  it("middleware usa redirect 301 (no rewrite) para tops", () => {
    const { readFileSync } = require("fs")
    const { join } = require("path")
    const src = readFileSync(join(__dirname, "../../../middleware.ts"), "utf8")
    expect(src).toContain("resolveTopSinGlutenRedirect")
    const idx = src.indexOf("const topTarget = resolveTopSinGlutenRedirect")
    expect(idx).toBeGreaterThan(-1)
    const topBlock = src.slice(idx, idx + 350)
    expect(topBlock).toMatch(/NextResponse\.redirect\(url,\s*301\)/)
    expect(topBlock).not.toContain("NextResponse.rewrite")
  })
})

describe("sitemap www + no tops + lastmod no Date.now", () => {
  it("buildSeoPages no incluye top-sin-gluten y usa www base", () => {
    const places: SitemapPlace[] = [
      {
        _id: { toString: () => "1" },
        type: "restaurant",
        types: ["restaurant"],
        province: "buenos-aires",
        locality: "la-plata",
        updatedAt: new Date("2024-06-01T00:00:00.000Z"),
      },
      {
        _id: { toString: () => "2" },
        type: "cafe",
        types: ["cafe"],
        province: "buenos-aires",
        locality: "la-plata",
        updatedAt: new Date("2024-07-01T00:00:00.000Z"),
      },
      {
        _id: { toString: () => "3" },
        type: "bakery",
        types: ["bakery"],
        province: "buenos-aires",
        locality: "la-plata",
        updatedAt: new Date("2024-05-01T00:00:00.000Z"),
      },
    ]
    const pages = buildSeoPages(CANONICAL_ORIGIN, places)
    expect(pages.every((p) => p.url.startsWith(CANONICAL_ORIGIN))).toBe(true)
    expect(pages.every((p) => !p.url.startsWith("http://"))).toBe(true)
    expect(pages.some((p) => p.url.includes("/top-sin-gluten"))).toBe(false)
    const city = pages.find((p) => p.url === `${CANONICAL_ORIGIN}/sin-gluten/la-plata`)
    expect(city?.lastModified).toEqual(new Date("2024-07-01T00:00:00.000Z"))
  })

  it("static lastmod no usa Date.now() implícito", () => {
    const frozen = new Date("2099-01-01T00:00:00.000Z")
    jest.useFakeTimers()
    jest.setSystemTime(frozen)
    const home = staticPageLastModified("/")
    expect(home).toBeDefined()
    expect(home!.getTime()).not.toBe(frozen.getTime())
    expect(home!.getUTCFullYear()).toBeLessThan(2099)
    jest.useRealTimers()
  })
})
