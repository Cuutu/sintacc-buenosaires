/**
 * @jest-environment node
 */
import { readFileSync } from "fs"
import path from "path"
import { OG_IMAGE, OG_IMAGE_PATH } from "@/lib/seo/og"

const root = path.join(__dirname, "../../..")
function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("home + root OG/Twitter image", () => {
  it("canonical share card is /og.png 1200x630", () => {
    expect(OG_IMAGE_PATH).toBe("/og.png")
    expect(OG_IMAGE.url).toBe("/og.png")
    expect(OG_IMAGE.width).toBe(1200)
    expect(OG_IMAGE.height).toBe(630)
  })

  it("app/page.tsx no pisa OG sin images y declara twitter card", () => {
    const src = read("app/page.tsx")
    expect(src).toContain("OG_IMAGE")
    expect(src).toContain('type: "website"')
    expect(src).toContain('locale: "es_AR"')
    expect(src).toContain('card: "summary_large_image"')
    expect(src).toContain("twitter:")
    expect(src).toContain("images:")
    expect(src).not.toMatch(/openGraph:\s*\{[^}]*url:\s*BASE_URL,\s*\}/s)
  })

  it("app/layout.tsx usa /og.png en OG y twitter.images", () => {
    const src = read("app/layout.tsx")
    expect(src).toContain("OG_IMAGE")
    expect(src).toContain("OG_IMAGE_PATH")
    expect(src).toContain('card: "summary_large_image"')
    expect(src).not.toContain("/brand/logo-principal.png")
  })
})

describe("security headers", () => {
  it("next.config.js envía nosniff, frame, referrer, permissions y CSP", () => {
    const src = read("next.config.js")
    expect(src).toContain("async headers()")
    expect(src).toContain("X-Content-Type-Options")
    expect(src).toContain("nosniff")
    expect(src).toContain("X-Frame-Options")
    expect(src).toContain("Referrer-Policy")
    expect(src).toContain("strict-origin-when-cross-origin")
    expect(src).toContain("Permissions-Policy")
    expect(src).toContain("Content-Security-Policy")
    expect(src).toContain("api.mapbox.com")
    expect(src).toContain("va.vercel-scripts.com")
    expect(src).toContain("res.cloudinary.com")
  })
})

describe("skip link y lazy footer logo", () => {
  it("LayoutChrome tiene skip link y un solo main con id estable", () => {
    const src = read("components/layout/LayoutChrome.tsx")
    expect(src).toContain('href="#contenido-principal"')
    expect(src).toContain("Saltar al contenido")
    expect(src).toContain('id="contenido-principal"')
    expect(src.match(/<main/g)?.length).toBe(1)
  })

  it("footer logo inverse lazy; hero home no lazy", () => {
    const footer = read("components/footer.tsx")
    const home = read("app/page.tsx")
    expect(footer).toContain('loading="lazy"')
    expect(footer).toContain("BrandLogo inverse")
    expect(home).toContain('<BrandLogo size="lg" />')
    expect(home).not.toMatch(/BrandLogo size="lg"[^/]*loading/)
  })
})
