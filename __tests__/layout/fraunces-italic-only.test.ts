import { execSync } from "child_process"
import { readFileSync } from "fs"
import path from "path"

const root = path.join(__dirname, "../..")

// layout.tsx carga Fraunces solo en itálica. Si alguien usa font-serif sin
// italic, el navegador inventaría una versión recta (fea): que se agregue
// "normal" a la carga en vez de romperse en silencio.
describe("Fraunces solo itálica", () => {
  it("layout.tsx carga solo la itálica", () => {
    const src = readFileSync(path.join(root, "app/layout.tsx"), "utf8")
    expect(src).toMatch(/Fraunces\(\{[\s\S]*?style:\s*\["italic"\]/)
  })

  it("toda clase font-serif va con italic", () => {
    const out = execSync('git grep -n "font-serif" -- app components lib', { cwd: root, encoding: "utf8" })
    const sinItalica = out
      .split("\n")
      .filter(Boolean)
      .filter((line) => !/\bitalic\b/.test(line))
    expect(sinItalica).toEqual([])
  })
})
