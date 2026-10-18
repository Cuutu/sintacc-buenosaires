import { isCelimapHost, stampPathFromScan } from "@/lib/wallet/scan"

const SERIAL = "a".repeat(32)

describe("lectura del QR de la tarjeta", () => {
  it("accepts CeliMap stamp links (www, apex and prueba)", () => {
    expect(stampPathFromScan(`https://www.celimap.com.ar/local/sellar/${SERIAL}`)).toBe(`/local/sellar/${SERIAL}`)
    expect(stampPathFromScan(`https://celimap.com.ar/local/sellar/${SERIAL}/`)).toBe(`/local/sellar/${SERIAL}`)
    expect(stampPathFromScan(` https://prueba.celimap.com.ar/local/sellar/${SERIAL} `)).toBe(`/local/sellar/${SERIAL}`)
  })

  it("accepts its own site in development", () => {
    expect(stampPathFromScan(`http://localhost:3000/local/sellar/${SERIAL}`, "http://localhost:3000")).toBe(
      `/local/sellar/${SERIAL}`
    )
  })

  it("rejects anything else", () => {
    expect(stampPathFromScan(`https://evil.com/local/sellar/${SERIAL}`)).toBeNull()
    expect(stampPathFromScan(`https://celimap.com.ar.evil.com/local/sellar/${SERIAL}`)).toBeNull()
    expect(stampPathFromScan(`http://www.celimap.com.ar/local/sellar/${SERIAL}`)).toBeNull()
    expect(stampPathFromScan(`https://www.celimap.com.ar/tarjeta/${SERIAL}`)).toBeNull()
    expect(stampPathFromScan(`https://www.celimap.com.ar/local/sellar/../../admin`)).toBeNull()
    expect(stampPathFromScan("hola")).toBeNull()
    expect(stampPathFromScan(`javascript:alert(1)//local/sellar/${SERIAL}`)).toBeNull()
    expect(isCelimapHost("notcelimap.com.ar")).toBe(false)
  })
})
