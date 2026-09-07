/**
 * @jest-environment node
 */
import { getSafetyBadge, VENTURE_SAFETY_DISCLAIMER, VENTURE_SAFETY_LEVELS } from "@/lib/venture-constants"
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("copy de seguridad emprendimientos", () => {
  it("claim de fuente, no sello CeliMap", () => {
    expect(getSafetyBadge("fully_gf").label).toBe("Se presenta como 100% sin gluten")
    expect(getSafetyBadge("gf_options").label).toBe("Se presenta con opciones sin TACC")
    expect(VENTURE_SAFETY_DISCLAIMER.toLowerCase()).toContain("no certifica")
    expect(VENTURE_SAFETY_LEVELS.every((s) => !s.label.startsWith("100%"))).toBe(true)
  })

  it("card y ficha usan el mismo helper y disclaimer", () => {
    const card = read("components/ventures/VentureCard.tsx")
    const profile = read("components/ventures/VentureProfileContent.tsx")
    expect(card).toContain("getSafetyBadge")
    expect(card).not.toContain('"100% sin gluten"')
    expect(profile).toContain("VENTURE_SAFETY_DISCLAIMER")
    expect(profile).not.toContain("Nivel de seguridad")
    expect(read("lib/venture-constants.ts")).toContain("CeliMap no certifica")
  })
})
