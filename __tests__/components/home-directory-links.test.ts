import { readFileSync } from "fs"
import path from "path"

const root = path.join(__dirname, "../..")

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("HomeDirectoryLinks explore chips", () => {
  const directory = read("components/home/HomeDirectoryLinks.tsx")
  const chip = read("components/home/ExploreChip.tsx")

  it("usa un solo ExploreChip para tipo y ciudad", () => {
    expect(directory).toContain("ExploreChip")
    expect(directory).toContain('align="start"')
    expect(chip).toContain("rounded-[16px]")
    expect(chip).not.toContain("rounded-full")
    expect(directory).not.toContain("rounded-full")
  })

  it("grilla fija por breakpoint, no tag cloud", () => {
    expect(directory).toContain("grid grid-cols-2 gap-3 lg:grid-cols-3")
    expect(directory).toContain("grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5")
    expect(directory).not.toContain("flex-wrap")
    expect(directory).not.toContain("w-fit")
    expect(directory).not.toContain("w-max")
    expect(chip).toContain("w-full")
    expect(chip).toContain("h-full")
    expect(chip).toContain("min-h-[44px]")
  })

  it("mantiene hubs de categoría, ciudad y directorio", () => {
    expect(directory).toContain("`/${c.slug}-sin-gluten`")
    expect(directory).toContain("`/sin-gluten/${city.slug}`")
    expect(directory).toContain('href="/sin-gluten-argentina"')
    expect(directory).toContain("getTop10CitySlugs")
    expect(directory).toContain('c.slug !== "otros"')
    expect(directory).toContain("Ver todas las ciudades")
    expect(directory).toContain("Explorá por tipo y ciudad")
  })

  it("respeta reduced motion en hover/press", () => {
    expect(chip).toContain("motion-reduce:transition-none")
    expect(chip).toContain("motion-reduce:hover:translate-y-0")
    expect(chip).toContain("motion-reduce:active:scale-100")
    expect(chip).toContain("focus-visible:ring-2")
  })
})
