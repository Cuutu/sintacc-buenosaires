/**
 * @jest-environment node
 */
import { branchAreaFor, findRepeatedNames } from "@/lib/place-branch-name"

describe("sucursales con el mismo nombre", () => {
  const places = [
    { name: "Celigourmet" },
    { name: "CeliGourmet " },
    { name: "Celigourmet" },
    { name: "Campobravo" },
    { name: "Campo Bravo" },
    { name: "Bröd" },
  ]

  it("detecta nombres repetidos sin importar mayúsculas, acentos ni espacios", () => {
    const repeated = findRepeatedNames(places)
    expect(repeated.has("celigourmet")).toBe(true)
    expect(repeated.has("brod")).toBe(false)
    // "Campobravo" y "Campo Bravo" no son el mismo texto: no se fuerzan.
    expect(repeated.has("campobravo")).toBe(false)
  })

  it("muestra el barrio solo si el nombre se repite", () => {
    const repeated = findRepeatedNames(places)
    expect(branchAreaFor({ name: "Celigourmet" }, "Palermo", repeated)).toBe("Palermo")
    expect(branchAreaFor({ name: "Bröd" }, "Villa Crespo", repeated)).toBeNull()
    expect(branchAreaFor({ name: "Celigourmet" }, "", repeated)).toBeNull()
  })

  it("no repite el barrio si ya está en el nombre", () => {
    const repeated = findRepeatedNames([{ name: "Celi Palermo" }, { name: "Celi Palermo" }])
    expect(branchAreaFor({ name: "Celi Palermo" }, "Palermo", repeated)).toBeNull()
  })
})
