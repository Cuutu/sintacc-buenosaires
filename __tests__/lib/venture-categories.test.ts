import { ZodError } from "zod"
import {
  getVentureCategories,
  parseVentureCategoryParam,
  ventureCategoryMongoFilter,
} from "@/lib/venture-constants"
import { normalizeVentureCategories } from "@/lib/validations"
import { matchesVentureSearch } from "@/lib/venture-search"
import { parseVentureLinks, withWhatsAppOrderMessage } from "@/lib/venture-contact"

describe("getVentureCategories", () => {
  it("usa categories cuando hay", () => {
    expect(getVentureCategories({ category: "panificados", categories: ["pasteleria", "viandas"] })).toEqual([
      "pasteleria",
      "viandas",
    ])
  })

  it("cae a category en docs viejos", () => {
    expect(getVentureCategories({ category: "viandas" })).toEqual(["viandas"])
    expect(getVentureCategories({ category: "viandas", categories: [] })).toEqual(["viandas"])
  })

  it("saca repetidos", () => {
    expect(getVentureCategories({ categories: ["viandas", "viandas"] })).toEqual(["viandas"])
  })
})

describe("parseVentureCategoryParam", () => {
  it("parsea lista separada por coma e ignora ids inválidos", () => {
    expect(parseVentureCategoryParam("panificados, viandas,nada,viandas")).toEqual([
      "panificados",
      "viandas",
    ])
  })

  it("vacío o null → []", () => {
    expect(parseVentureCategoryParam(null)).toEqual([])
    expect(parseVentureCategoryParam("")).toEqual([])
  })
})

describe("ventureCategoryMongoFilter", () => {
  it("matchea categories o el category legacy", () => {
    expect(ventureCategoryMongoFilter(["viandas"])).toEqual({
      $or: [{ categories: { $in: ["viandas"] } }, { category: { $in: ["viandas"] } }],
    })
  })
})

describe("normalizeVentureCategories", () => {
  it("category principal = primera de categories", () => {
    expect(
      normalizeVentureCategories({ categories: ["pasteleria", "panificados"] }, { required: true })
    ).toEqual({ category: "pasteleria", categories: ["pasteleria", "panificados"] })
  })

  it("acepta solo category (clientes viejos)", () => {
    expect(normalizeVentureCategories({ category: "viandas" }, { required: true })).toEqual({
      category: "viandas",
      categories: ["viandas"],
    })
  })

  it("required sin categorías tira ZodError", () => {
    expect(() => normalizeVentureCategories({ categories: [] }, { required: true })).toThrow(ZodError)
  })

  it("update parcial sin categorías no toca nada", () => {
    const data = { name: "X" } as { name: string; category?: string; categories?: string[] }
    expect(normalizeVentureCategories(data, { required: false })).toBe(data)
  })
})

describe("matchesVentureSearch con varias categorías", () => {
  it("encuentra por una categoría secundaria", () => {
    const venture = {
      name: "Marca",
      zone: "CABA",
      category: "panificados",
      categories: ["panificados", "viandas"],
    }
    expect(matchesVentureSearch(venture, "viandas")).toBe(true)
  })
})

describe("mensaje de WhatsApp", () => {
  it("agrega el mensaje predeterminado a wa.me", () => {
    expect(withWhatsAppOrderMessage("https://wa.me/5491112345678")).toBe(
      "https://wa.me/5491112345678?text=Hola%2C%20los%20vi%20en%20CeliMap%20y%20me%20gustar%C3%ADa%20hacer%20un%20pedido"
    )
  })

  it("no toca links que no son wa.me (grupos, etc.)", () => {
    expect(withWhatsAppOrderMessage("https://chat.whatsapp.com/abc")).toBe("https://chat.whatsapp.com/abc")
    expect(withWhatsAppOrderMessage(null)).toBeNull()
  })

  it("parseVentureLinks devuelve el link con el mensaje", () => {
    const links = parseVentureLinks({ contact: { whatsapp: "+54 9 11 1234-5678" } })
    expect(links.whatsapp).toMatch(/^https:\/\/wa\.me\/5491112345678\?text=Hola/)
  })
})
