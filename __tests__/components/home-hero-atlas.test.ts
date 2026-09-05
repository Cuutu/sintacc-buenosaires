import fs from "fs"
import path from "path"

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("hero atlas fondo", () => {
  it("calles #E8E0D0, pines marca al 35%, sin rutas punteadas", () => {
    const atlas = read("components/home/CeliMapAtlas.tsx")
    const css = read("app/globals.css")
    expect(atlas).toContain('stroke="#E8E0D0"')
    expect(atlas).toContain("pinAssetPath")
    expect(atlas).toContain('href={href}')
    expect(atlas).toContain('tone="dedicated"')
    expect(atlas).toContain('tone="options"')
    expect(atlas).not.toContain("strokeDasharray")
    expect(read("lib/celimap-pin.ts")).toContain("/map/pin-dedicated.png")
    expect(read("lib/celimap-pin.ts")).toContain("/map/pin-options.png")
    expect(css).toContain("linear-gradient")
    expect(css).toContain("#f7f3eb")
    expect(css).not.toContain("ellipse 48% 42% at 50% 46%")
  })
})
