import fs from "fs"
import path from "path"

/**
 * Escala de la home (revisión 20/10): texto en 16/14/12 y Nunito en tres pesos
 * (normal, bold, extrabold). Los tamaños sueltos (15, 13, 11 px…) y los pesos
 * medium/semibold volvían a aparecer de a uno. Los títulos (H1 del hero, H2 de 28 px,
 * nombres de destacados en Fraunces) quedan afuera.
 */
const ROOT = path.join(__dirname, "../..")
const FILES = [
  "app/page.tsx",
  "components/search-bar.tsx",
  "components/home/home-ui.ts",
  "components/home/CeliBotEntry.tsx",
  "components/home/CommunityBand.tsx",
  "components/home/EmprendimientosSection.tsx",
  "components/home/ExploreChip.tsx",
  "components/home/FaqSection.tsx",
  "components/home/HomeDirectoryLinks.tsx",
  "components/home/HomeFeatured.tsx",
  "components/home/HomeFeaturedCard.tsx",
  "components/home/HomeGuides.tsx",
  "components/home/HomeSectionHeader.tsx",
  "components/home/HowItWorks.tsx",
  "components/home/NearMeButton.tsx",
  "components/home/SafetyModeSwitch.tsx",
  "components/home/TakeCeliMapWithYou.tsx",
]
const HEADING_SIZES = new Set(["text-[22px]", "text-[28px]", "text-[36px]", "text-[46px]"])

describe("tipografía de la home", () => {
  it.each(FILES)("%s no usa tamaños sueltos", (file) => {
    const src = fs.readFileSync(path.join(ROOT, file), "utf8")
    const sizes = (src.match(/text-\[\d+(?:\.\d+)?px\]/g) ?? []).filter((s) => !HEADING_SIZES.has(s))
    expect(sizes).toEqual([])
  })

  it.each(FILES)("%s usa medium solo en Fraunces y nunca semibold", (file) => {
    const src = fs.readFileSync(path.join(ROOT, file), "utf8")
    expect(src).not.toMatch(/\bfont-semibold\b/)
    for (const line of src.split("\n").filter((l) => /\bfont-medium\b/.test(l))) {
      expect(line).toContain("font-serif")
    }
  })

  it("Buscar va con el redondeo de los botones y CeliBot del final, solo en el celular", () => {
    const search = fs.readFileSync(path.join(ROOT, "components/search-bar.tsx"), "utf8")
    const faq = fs.readFileSync(path.join(ROOT, "components/home/FaqSection.tsx"), "utf8")
    expect(search).toContain("rounded-[16px] bg-[#B84420]")
    expect(faq).toMatch(/className="mt-6 md:hidden">\s*<CeliBotEntry \/>/)
  })
})
