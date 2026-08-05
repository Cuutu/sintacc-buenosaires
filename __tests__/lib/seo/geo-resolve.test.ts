/**
 * Tests de la resolucion geografica estricta.
 * Verifican que calles/avenidas/barrios NUNCA determinan province/locality.
 */

const STREET_PREFIXES = ["av", "avenida", "calle", "pasaje", "bulevar", "boulevard", "ruta", "camino", "autopista", "gral", "general", "dr", "doctor", "sargento", "teniente", "coronel", "pr", "presidente", "cnl", "tcnl"]

// Capitales que son tambien provincia: como segmento generico representan la provincia,
// NO una localidad. La localidad solo se asigna via override o evidencia estructurada.
const AMBIGUOUS_CAPITALS = new Set([
  "buenos-aires", "cordoba", "mendoza", "salta", "santa-fe", "san-juan", "san-luis",
  "resistencia", "neuquen", "corrientes", "parana", "santiago-del-estero", "rio-gallegos",
])

const KNOWN_LOCALITIES: Record<string, string> = {
  "yerba-buena": "tucuman", "olivos": "buenos-aires", "martinez": "buenos-aires",
  "general-pico": "la-pampa", "puerto-madryn": "chubut", "santiago-del-estero": "santiago-del-estero",
  "rio-gallegos": "santa-cruz", "villa-union": "la-rioja", "buenos-aires": "caba",
  "la-plata": "buenos-aires", "mar-del-plata": "buenos-aires", "cordoba": "cordoba",
  "rosario": "santa-fe", "mendoza": "mendoza", "san-miguel-de-tucuman": "tucuman",
  "salta": "salta", "santa-fe": "santa-fe", "san-juan": "san-juan",
  "resistencia": "chaco", "neuquen": "neuquen", "corrientes": "corrientes",
  "parana": "entre-rios", "bahia-blanca": "buenos-aires", "san-luis": "san-luis",
  "rio-cuarto": "cordoba", "comodoro-rivadavia": "chubut", "tandil": "buenos-aires",
  "ushuaia": "tierra-del-fuego",
}

function norm(v: string): string {
  return (v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
}

function isStreet(t: string): boolean {
  const x = norm(t)
  if (!x) return false
  return STREET_PREFIXES.some((p) => x.indexOf(p + " ") === 0 || x === p)
}

/** Localidad SOLO si es segmento independiente, sin numero de altura, no calle/avenida, y no capital ambigua. */
function localityStrict(address: string): string | undefined {
  if (!address) return undefined
  const segs = String(address).split(",").map(norm).filter(Boolean)
  // Buscar el ultimo segmento que sea una localidad conocida NO ambigua
  for (const seg of segs) {
    const c = seg.replace(/^\d+\s*/, "").trim()
    if (!c || isStreet(c)) continue
    if (/\d/.test(c)) continue
    for (const slug in KNOWN_LOCALITIES) {
      if (c === norm(slug.replace(/-/g, " ")) && !AMBIGUOUS_CAPITALS.has(slug)) return slug
    }
  }
  return undefined
}

/** Provincia SOLO desde componente estructurado explicito ("Provincia de X"). */
function provinceStructured(t: string): string | undefined {
  if (!t) return undefined
  const n = norm(t)
  const provs: Record<string, string> = {
    "buenos aires": "buenos-aires", "cordoba": "cordoba", "tucuman": "tucuman",
    "santa fe": "santa-fe", "mendoza": "mendoza", "salta": "salta",
    "santa cruz": "santa-cruz", "chaco": "chaco", "chubut": "chubut",
    "la pampa": "la-pampa", "la rioja": "la-rioja", "corrientes": "corrientes",
    "entre rios": "entre-rios", "san luis": "san-luis", "san juan": "san-juan",
    "santiago del estero": "santiago-del-estero", "tierra del fuego": "tierra-del-fuego",
    "neuquen": "neuquen", "rio negro": "rio-negro", "formosa": "formosa",
    "jujuy": "jujuy", "misiones": "misiones", "catamarca": "catamarca",
  }
  for (const p in provs) { if (n.indexOf("provincia de " + p) !== -1) return provs[p] }
  if (n.indexOf("ciudad autonoma") !== -1 || n.indexOf("cdad") !== -1 || n.indexOf("capital federal") !== -1) return "caba"
  return undefined
}

describe("geo-resolve estricto", () => {
  it("Avenida Corrientes no produce localidad Corrientes", () => {
    expect(localityStrict("Av. Corrientes 1234, Buenos Aires, Argentina")).toBeUndefined()
  })
  it("Calle Parana no produce localidad Parana", () => {
    expect(localityStrict("Paraná 3745, Buenos Aires")).toBeUndefined()
  })
  it("Calle Mendoza no produce localidad Mendoza", () => {
    expect(localityStrict("Mendoza 1667, CABA")).toBeUndefined()
  })
  it("Guillermo Rawson no produce San Juan", () => {
    expect(localityStrict("Guillermo Rawson 2851, CABA")).toBeUndefined()
  })
  it("Avenida Rafael Nunez no produce CABA/Buenos Aires", () => {
    const r = localityStrict("Av. Rafael Núñez 5000, Córdoba")
    expect(r).not.toBe("buenos-aires")
    expect(r).not.toBe("caba")
  })
  it("neighborhood Centro no decide ciudad ni provincia", () => {
    expect(localityStrict("Centro")).toBeUndefined()
  })
  it("resuelve localidad cuando es segmento independiente conocido no ambiguo", () => {
    expect(localityStrict("Calle 7, La Plata, Buenos Aires")).toBe("la-plata")
    expect(localityStrict("Av. Colón 100, Mar del Plata, Buenos Aires")).toBe("mar-del-plata")
  })
  it("resuelve provincia solo desde 'Provincia de X' explicito", () => {
    expect(provinceStructured("Calle 1, Provincia de Tucumán, Argentina")).toBe("tucuman")
    expect(provinceStructured("Av. Corrientes 100, Ciudad Autónoma de Buenos Aires")).toBe("caba")
  })
  it("no resuelve provincia desde una calle", () => {
    expect(provinceStructured("Av. Corrientes 100, Buenos Aires")).toBeUndefined()
    expect(provinceStructured("Calle Mendoza 50, CABA")).toBeUndefined()
  })
  it("Yerba Buena se resuelve a tucuman, no a san-miguel-de-tucuman", () => {
    expect(localityStrict("Av. Aconquija 100, Yerba Buena, Tucumán")).toBe("yerba-buena")
    expect(KNOWN_LOCALITIES["yerba-buena"]).toBe("tucuman")
  })
})