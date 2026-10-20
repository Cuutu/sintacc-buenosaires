/**
 * @jest-environment node
 */
import fs from "fs"
import path from "path"
import { pickHomeVentures, shortVentureZone, toHomeVenture, type HomeVenture } from "@/lib/home/get-home-ventures"

jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/lib/api-cache", () => ({ getOrSetApiCache: jest.fn() }))

function venture(id: string, category: string, photo: boolean, knownProducts = true): HomeVenture {
  return {
    id,
    href: `/emprendimientos/${id}`,
    name: id,
    category,
    sells: category,
    zone: "CABA",
    photo: photo ? `https://res.cloudinary.com/x/${id}.jpg` : null,
    knownProducts,
  }
}

describe("emprendimientos de la home", () => {
  it("arma la tarjeta: qué venden sin formas de venta, zona con CABA y link al perfil", () => {
    const card = toHomeVenture({
      _id: { toString: () => "abc" },
      slug: "masa-madre-sin-tacc",
      name: " Masa Madre ",
      category: "panificados",
      categories: ["panificados", "envios_domicilio", "pasteleria", "viandas"],
      zone: "caba y zona norte",
      modalities: ["envios"],
      photos: ["", " https://res.cloudinary.com/x/1.jpg "],
    })
    expect(card).toEqual({
      id: "abc",
      href: "/emprendimientos/masa-madre-sin-tacc",
      name: "Masa Madre",
      category: "panificados",
      sells: "Panificados · Pastelería",
      zone: "CABA y zona norte",
      photo: "https://res.cloudinary.com/x/1.jpg",
      knownProducts: true,
    })
  })

  it("acorta la zona: sin provincia ni país al final, hasta dos partes", () => {
    expect(shortVentureZone("Villa Ballester, San Martín, Provincia de Buenos Aires")).toBe("Villa Ballester, San Martín")
    expect(shortVentureZone("Baradero, provincia de Buenos Aires")).toBe("Baradero")
    expect(shortVentureZone("Mar del Plata, Buenos Aires")).toBe("Mar del Plata")
    expect(shortVentureZone("CABA, San Telmo.")).toBe("CABA, San Telmo")
    expect(shortVentureZone("Caba")).toBe("CABA")
    expect(shortVentureZone("Buenos Aires")).toBe("Buenos Aires")
    expect(shortVentureZone("")).toBe("")
  })

  it("si solo tiene formas de venta, muestra cómo vende; sin slug usa el id", () => {
    const card = toHomeVenture({
      _id: { toString: () => "abc" },
      name: "Feria",
      categories: ["ferias_retiro"],
      modalities: ["ferias", "retiro"],
      photos: [],
    })
    expect(card.sells).toBe("Ferias · Retiro")
    expect(card.href).toBe("/emprendimientos/abc")
    expect(card.photo).toBeNull()
    expect(card.knownProducts).toBe(false)
  })

  it("primero con foto y una categoría de cada una antes de repetir", () => {
    const list = [
      venture("a", "pasteleria", true),
      venture("b", "pasteleria", true),
      venture("c", "viandas", false),
      venture("d", "panificados", true),
      venture("e", "viandas", true),
      venture("f", "congelados", false),
    ]
    expect(pickHomeVentures(list).map((v) => v.id)).toEqual(["a", "d", "e", "b"])
  })

  it("con foto pero sin productos cargados va después de los que dicen qué hacen", () => {
    const list = [
      venture("feria", "ferias_retiro", true, false),
      venture("a", "pasteleria", true),
      venture("b", "viandas", false),
    ]
    expect(pickHomeVentures(list).map((v) => v.id)).toEqual(["a", "feria", "b"])
  })

  it("completa con los que no tienen foto si faltan", () => {
    const list = [venture("a", "pasteleria", true), venture("b", "viandas", false), venture("c", "viandas", false)]
    expect(pickHomeVentures(list).map((v) => v.id)).toEqual(["a", "b", "c"])
  })

  it("usa el mismo catálogo que /emprendimientos (aprobados, 100%, Argentina) y se invalida con public:ventures", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../lib/home/get-home-ventures.ts"), "utf8")
    expect(src).toContain('status: "approved"')
    expect(src).toContain("dedicatedVentureMongoFilter()")
    expect(src).toContain("argentinaVentureMongoFilter()")
    expect(src).toContain('"public:ventures:home"')
  })
})
