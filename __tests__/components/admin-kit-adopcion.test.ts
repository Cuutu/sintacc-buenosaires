/**
 * @jest-environment node
 */
import { readdirSync, readFileSync, statSync } from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : name.endsWith(".tsx") ? [full] : []
  })

describe("el admin usa el kit", () => {
  const files = walk(path.join(root, "components/admin")).filter((f) => !f.includes(`${path.sep}ui${path.sep}`))

  it("no usa el Button de shadcn (su borde oliva era el 'casi negro' de Cancelar)", () => {
    const offenders = files.filter((f) => readFileSync(f, "utf8").includes('from "@/components/ui/button"'))
    expect(offenders.map((f) => path.relative(root, f))).toEqual([])
  })

  it("las opciones de los formularios marcan lo elegido en oliva, no en terracota", () => {
    for (const rel of ["components/admin/PlaceEditModal.tsx", "components/admin/VentureEditModal.tsx"]) {
      const src = readFileSync(path.join(root, rel), "utf8")
      expect(src).not.toMatch(/variant=\{[^}]*"default" : "outline"\}/)
      expect(src).toContain("<FilterChip")
    }
  })

  it("el modal no repite la foto en grande ni un 'Guardar' de mentira en la vista previa", () => {
    const studio = readFileSync(path.join(root, "components/admin/ops/AdminPhotoStudio.tsx"), "utf8")
    expect(studio).toMatch(/if \(compact\) \{[\s\S]*<ImageUpload/)
    const modal = readFileSync(path.join(root, "components/admin/PlaceEditModal.tsx"), "utf8")
    expect(modal).not.toContain("<span className={adminUi.chip}>Guardar</span>")
  })
})
