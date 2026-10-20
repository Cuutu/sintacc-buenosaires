/**
 * @jest-environment node
 */
import { isSameBrand, placeBrandKey, uniqueByBrand } from "@/lib/place-brand"

describe("marca de un lugar (destacados sin sucursales repetidas)", () => {
  it("ignora mayúsculas, tildes, hashtags y 'sin TACC'", () => {
    expect(placeBrandKey("Churros El Topo #SINTACC")).toBe("churros el topo")
    expect(placeBrandKey("Churros El Topo #SinTacc")).toBe("churros el topo")
    expect(placeBrandKey("Panadería Celíaca 100% Sin Gluten")).toBe("panaderia celiaca")
    expect(placeBrandKey("Gluten Free Café")).toBe("cafe")
  })

  it("corta la sucursal después de un guion, una barra o un paréntesis", () => {
    expect(placeBrandKey("Dulce Ciervo - Palermo")).toBe("dulce ciervo")
    expect(placeBrandKey("Dulce Ciervo | Belgrano")).toBe("dulce ciervo")
    expect(placeBrandKey("Dulce Ciervo (Acassuso)")).toBe("dulce ciervo")
  })

  it("saca el barrio del final si coincide con el del lugar", () => {
    expect(placeBrandKey("Celina Bakery Núñez", "Nuñez")).toBe("celina bakery")
    expect(placeBrandKey("Celina Bakery Núñez", "Palermo")).toBe("celina bakery nunez")
  })

  it("misma marca: clave igual o una que empieza con la otra (dos palabras con peso)", () => {
    expect(isSameBrand("dulce ciervo", "dulce ciervo cafe")).toBe(true)
    expect(isSameBrand("churros el topo", "churros el topo")).toBe(true)
    expect(isSameBrand("la panera", "la panera rosa")).toBe(false)
    expect(isSameBrand("dulce", "dulcería")).toBe(false)
    expect(isSameBrand("", "")).toBe(false)
  })

  it("deja la primera sucursal de cada marca, en orden", () => {
    const list = [
      { name: "Churros El Topo #SINTACC", neighborhood: "Acassuso" },
      { name: "Lele de Troya", neighborhood: "Palermo" },
      { name: "Churros El Topo #SinTacc", neighborhood: "Belgrano" },
      { name: "La Panera Rosa", neighborhood: "Recoleta" },
      { name: "La Panera Sin TACC", neighborhood: "Caballito" },
    ]
    expect(uniqueByBrand(list).map((p) => `${p.name} (${p.neighborhood})`)).toEqual([
      "Churros El Topo #SINTACC (Acassuso)",
      "Lele de Troya (Palermo)",
      "La Panera Rosa (Recoleta)",
      "La Panera Sin TACC (Caballito)",
    ])
  })
})
