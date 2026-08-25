/**
 * @jest-environment node
 */
import { readFileSync } from "fs"
import path from "path"

describe("llms.txt", () => {
  it("describe la entidad CeliMap y páginas clave", () => {
    const body = readFileSync(
      path.join(__dirname, "../../../app/llms.txt/route.ts"),
      "utf8"
    )
    expect(body).toMatch(/CELIMAP_NAME/)
    expect(body).toMatch(/CELIMAP_DESCRIPTION/)
    expect(body).toMatch(/\/comprar-productos-sin-tacc/)
    expect(body).toMatch(/\/por-que-usar-celimap/)
    expect(body).toMatch(/Not a certification body/)
    expect(body).not.toMatch(/reliable/)
  })
})
