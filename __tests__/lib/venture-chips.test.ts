/**
 * @jest-environment node
 */
import { ventureModalityChips } from "@/lib/venture-constants"

describe("chips de emprendimiento sin repetir (revisión 23/10)", () => {
  it("con la categoría Envíos a domicilio no van Envíos ni Delivery", () => {
    expect(ventureModalityChips(["pasteleria", "envios_domicilio"], ["envios", "delivery", "retiro"])).toEqual(["Retiro"])
  })
  it("Delivery + Envíos sin esa categoría: un solo chip", () => {
    expect(ventureModalityChips(["viandas"], ["delivery", "envios"])).toEqual(["Delivery y envíos"])
  })
  it("Ferias / retiro absorbe Ferias y Retiro", () => {
    expect(ventureModalityChips(["ferias_retiro"], ["ferias", "retiro", "delivery"])).toEqual(["Delivery"])
  })
  it("sin repetidos, igual que antes", () => {
    expect(ventureModalityChips(["viandas"], ["retiro", "retiro"])).toEqual(["Retiro"])
  })
})
