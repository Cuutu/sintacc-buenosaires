import { decodeStoredText } from "@/lib/stored-text"
import { sanitizeHtml } from "@/lib/validations"

describe("decodeStoredText", () => {
  it("deshace lo que hace sanitizeHtml al guardar", () => {
    const original = `Pedí la "milanesa" y el <postre> de Ana's / 10 puntos & más`
    const stored = sanitizeHtml(original)
    expect(stored).toContain("&quot;")
    expect(decodeStoredText(stored)).toBe(original.replace("&", "&"))
  })

  it("muestra comillas en lugar de &quot;", () => {
    expect(decodeStoredText("&quot;Riquísimo&quot;")).toBe('"Riquísimo"')
    expect(decodeStoredText("&#x27;bien&#x27; &#X2F; &#47;")).toBe("'bien' / /")
  })

  it("no toca texto normal ni entidades desconocidas", () => {
    expect(decodeStoredText("Todo bien")).toBe("Todo bien")
    expect(decodeStoredText("&nbsp;hola")).toBe("&nbsp;hola")
    expect(decodeStoredText(undefined)).toBe("")
    expect(decodeStoredText(null)).toBe("")
  })
})
