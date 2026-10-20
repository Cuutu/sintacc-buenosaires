/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"
import { renderToStaticMarkup } from "react-dom/server"
import { HeroPhoneMockup } from "@/components/home/HeroPhoneMockup"

const ROOT = path.join(__dirname, "../..")

describe("celular del hero (compu ancha)", () => {
  it("es decorativo, solo desde xl y sin imágenes (no suma peso ni compite con el LCP)", () => {
    const html = renderToStaticMarkup(<HeroPhoneMockup />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toMatch(/class="[^"]*\bhidden\b[^"]*\bxl:block\b/)
    expect(html).not.toContain("<img")
    const src = fs.readFileSync(path.join(ROOT, "components/home/HeroPhoneMockup.tsx"), "utf8")
    expect(src).not.toContain("next/image")
  })

  it("la tarjeta muestra el primer destacado real; sin destacado no inventa un nombre", () => {
    const withPlace = renderToStaticMarkup(
      <HeroPhoneMockup
        place={{
          _id: "p1",
          name: "Lele de Troya",
          type: "restaurant",
          neighborhood: "Palermo",
          stats: { avgRating: 4.8, totalReviews: 12 },
        }}
      />
    )
    expect(withPlace).toContain("Lele de Troya")
    expect(withPlace).toContain("Palermo")
    expect(withPlace).toContain("12 reseñas")
    expect(renderToStaticMarkup(<HeroPhoneMockup />)).toContain("Lugares cerca tuyo")
  })

  it("en el hero, los pines de compu quedan solo entre 1024 y 1279 px", () => {
    const pins = fs.readFileSync(path.join(ROOT, "components/home/HeroPins.tsx"), "utf8")
    const page = fs.readFileSync(path.join(ROOT, "app/page.tsx"), "utf8")
    expect(pins).toContain("lg:block xl:hidden")
    expect(page).toContain("<HeroPhoneMockup place={featuredPlaces[0]} />")
  })
})
