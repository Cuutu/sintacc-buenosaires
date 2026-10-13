/**
 * @jest-environment node
 */
import { configuredMapStyleUrl, mapStyleIdFromUrl, resolveMapStyleUrl } from "@/lib/mapbox-style"

const DEFAULT = "mapbox://styles/cuutu/cmtnrjtlq003a01qmclt69831"

describe("mapbox-style", () => {
  const original = process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL
    else process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL = original
  })

  it("usa el estilo configurado si es una URL de estilo válida", () => {
    expect(resolveMapStyleUrl(" mapbox://styles/cuutu/papel123 ", DEFAULT)).toBe("mapbox://styles/cuutu/papel123")
  })

  it("cae al estilo por defecto si la variable falta o no es válida", () => {
    expect(resolveMapStyleUrl(undefined, DEFAULT)).toBe(DEFAULT)
    expect(resolveMapStyleUrl("", DEFAULT)).toBe(DEFAULT)
    expect(resolveMapStyleUrl("https://api.mapbox.com/styles/v1/cuutu/x", DEFAULT)).toBe(DEFAULT)
    expect(resolveMapStyleUrl("mapbox://styles/mapbox/light-v11?x=1", DEFAULT)).toBe(DEFAULT)
  })

  it("lee NEXT_PUBLIC_MAPBOX_STYLE_URL", () => {
    process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL = "mapbox://styles/cuutu/papel123"
    expect(configuredMapStyleUrl(DEFAULT)).toBe("mapbox://styles/cuutu/papel123")
    delete process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL
    expect(configuredMapStyleUrl(DEFAULT)).toBe(DEFAULT)
  })

  it("extrae el id del estilo", () => {
    expect(mapStyleIdFromUrl(DEFAULT)).toBe("cmtnrjtlq003a01qmclt69831")
    expect(mapStyleIdFromUrl("no-es-un-estilo")).toBeNull()
  })
})
