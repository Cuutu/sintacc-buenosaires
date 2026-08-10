import { isPrivateListPath } from "@/lib/lists/is-private-list-path"

describe("isPrivateListPath", () => {
  it("detecta rutas privadas", () => {
    expect(isPrivateListPath("/listas/privadas")).toBe(true)
    expect(isPrivateListPath("/listas/privadas/abcTOKEN123")).toBe(true)
  })

  it("no marca rutas públicas", () => {
    expect(isPrivateListPath("/listas")).toBe(false)
    expect(isPrivateListPath("/listas/507f1f77bcf86cd799439011")).toBe(false)
    expect(isPrivateListPath("/favoritos")).toBe(false)
    expect(isPrivateListPath(null)).toBe(false)
  })
})
