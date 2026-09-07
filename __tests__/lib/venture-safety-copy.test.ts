/**
 * @jest-environment node
 */
import {
  getSafetyBadge,
  VENTURE_SAFETY_DISCLAIMER,
  VENTURE_SAFETY_LEVELS,
  VENTURE_SUGGEST_SAFETY_LEVELS,
  VENTURE_CATALOG_INTRO,
  isCatalogDedicatedVenture,
  dedicatedVentureMongoFilter,
} from "@/lib/venture-constants"
import fs from "fs"
import path from "path"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

describe("copy de seguridad emprendimientos", () => {
  it("claim de fuente, no sello CeliMap; catálogo solo dedicado", () => {
    expect(getSafetyBadge("fully_gf").label).toBe("Se presenta como 100% sin gluten")
    expect(isCatalogDedicatedVenture("fully_gf")).toBe(true)
    expect(isCatalogDedicatedVenture("to_confirm")).toBe(true)
    expect(isCatalogDedicatedVenture("gf_options")).toBe(false)
    expect(dedicatedVentureMongoFilter()).toEqual({ safetyLevel: { $ne: "gf_options" } })
    expect(VENTURE_SUGGEST_SAFETY_LEVELS.some((s) => s.id === "gf_options")).toBe(false)
    expect(VENTURE_CATALOG_INTRO.toLowerCase()).toContain("100% sin gluten")
    expect(VENTURE_SAFETY_DISCLAIMER.toLowerCase()).toContain("no certifica")
    expect(VENTURE_SAFETY_LEVELS.every((s) => !s.label.startsWith("100%"))).toBe(true)
  })

  it("card y ficha usan el mismo helper y disclaimer", () => {
    const card = read("components/ventures/VentureCard.tsx")
    const profile = read("components/ventures/VentureProfileContent.tsx")
    expect(card).toContain("getSafetyBadge")
    expect(card).not.toContain("Se presenta con opciones")
    expect(profile).toContain("VENTURE_SAFETY_DISCLAIMER")
    expect(profile).toContain("VENTURE_CATALOG_INTRO")
    expect(profile).not.toContain("Nivel de seguridad")
    expect(read("lib/venture-constants.ts")).toContain("CeliMap no certifica")
  })
})
