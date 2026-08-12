import { readFileSync } from "fs"
import path from "path"
import { getSEOTextBlock, buildCityFaqs } from "@/lib/seo/templates"
import { CITIES } from "@/lib/seo/cities"
import { FAQ_ITEMS } from "@/components/home/FaqSection"

const root = path.join(__dirname, "../../..")

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("city/category page structure — sin FAQs duplicadas", () => {
  it("getSEOTextBlock no incluye sección Preguntas frecuentes", () => {
    const city = CITIES.find((c) => c.slug === "la-plata")!
    const block = getSEOTextBlock(city, undefined, {
      total: 5,
      dedicatedGf: 1,
      gfOptions: 2,
    })
    expect(block).not.toMatch(/## Preguntas frecuentes/i)
    expect(block).not.toContain(
      buildCityFaqs(city, { total: 5, dedicatedGf: 1, gfOptions: 2 })[0].question
    )
  })

  it("buildCityFaqs visible coincide con claims honestos", () => {
    const city = CITIES.find((c) => c.slug === "la-plata")!
    const faqs = buildCityFaqs(city, { total: 3, dedicatedGf: 1, gfOptions: 1 })
    expect(faqs).toHaveLength(3)
    const joined = faqs.map((f) => f.answer).join(" ")
    expect(joined).toMatch(/confirmá/i)
    expect(joined).not.toMatch(/garantiza que un lugar.*sea seguro para todas/i)
    expect(joined).not.toMatch(/todo el menú es seguro/i)
    expect(faqs.some((f) => f.question.includes("garantiza"))).toBe(true)
  })

  it("página ciudad: un bloque FAQ + SEOTextBlock sin FAQ", () => {
    const src = read("app/sin-gluten/[ciudadSlug]/page.tsx")
    const faqSections = src.match(/Preguntas frecuentes/g) || []
    expect(faqSections.length).toBe(1)
    expect(src).toContain("CityPageExtras")
    expect(src).toContain("SEOTextBlock")
    expect(src).toContain("buildCityFaqs")
    expect(src).toContain("CityPageJsonLd")
  })

  it("página categoría: un bloque FAQ visible", () => {
    const src = read("app/sin-gluten/[ciudadSlug]/[categoriaSlug]/page.tsx")
    const faqSections = src.match(/Preguntas frecuentes/g) || []
    expect(faqSections.length).toBe(1)
  })

  it("home FAQ_ITEMS honestas y sin verificación falsa", () => {
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(3)
    const blob = FAQ_ITEMS.map((i) => `${i.question} ${i.answer}`).join("\n")
    expect(blob).toContain("¿CeliMap garantiza")
    expect(blob).toMatch(/No\./)
    expect(blob).not.toMatch(/verificados por la comunidad/i)
    expect(blob).not.toMatch(/organismo de certificación/i)
  })
})
