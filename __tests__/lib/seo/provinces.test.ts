import {
  getProvinceByAlias,
  getProvinceByName,
  getProvinceBySlug,
  isProvincialSlug,
  normalizeProvinceSlug,
  resolveProvinceFromAddress,
  PROVINCES,
} from "@/lib/seo/provinces"

describe("lib/seo/provinces", () => {
  it("tiene las 24 jurisdicciones argentinas", () => {
    expect(PROVINCES).toHaveLength(24)
    const slugs = PROVINCES.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(24)
  })

  it("normaliza slugs sin tildes", () => {
    expect(normalizeProvinceSlug("Tucumán")).toBe("tucuman")
    expect(normalizeProvinceSlug("Neuquén")).toBe("neuquen")
    expect(normalizeProvinceSlug("Córdoba")).toBe("cordoba")
    expect(normalizeProvinceSlug("Río Negro")).toBe("rio-negro")
  })

  it("resuelve aliases inequívocos", () => {
    expect(getProvinceByAlias("CABA")?.slug).toBe("caba")
    expect(getProvinceByAlias("Capital Federal")?.slug).toBe("caba")
    expect(getProvinceByAlias("PBA")?.slug).toBe("buenos-aires")
    expect(getProvinceByAlias("Provincia de Buenos Aires")?.slug).toBe("buenos-aires")
    expect(getProvinceByAlias("Buenos Aires Province")?.slug).toBe("buenos-aires")
  })

  it("NO resuelve 'Buenos Aires' a secas como PBA (ambiguo con CABA)", () => {
    expect(getProvinceByAlias("Buenos Aires")).toBeUndefined()
    expect(getProvinceByName("Buenos Aires")).toBeUndefined()
    expect(normalizeProvinceSlug("Buenos Aires")).toBeNull()
  })

  it("separa CABA de Provincia de Buenos Aires", () => {
    const caba = getProvinceBySlug("caba")
    const pba = getProvinceBySlug("buenos-aires")
    expect(caba?.name).toBe("Ciudad Autónoma de Buenos Aires")
    expect(pba?.name).toBe("Buenos Aires")
    expect(caba?.slug).not.toBe(pba?.slug)
  })

  it("isProvincialSlug devuelve true para slugs provinciales válidos", () => {
    expect(isProvincialSlug("cordoba")).toBe(true)
    expect(isProvincialSlug("tucuman")).toBe(true)
    expect(isProvincialSlug("buenos-aires")).toBe(true)
    expect(isProvincialSlug("caba")).toBe(true)
  })

  it("isProvincialSlug devuelve false para slugs que no son provincia", () => {
    expect(isProvincialSlug("la-plata")).toBe(false)
    expect(isProvincialSlug("san-miguel-de-tucuman")).toBe(false)
    expect(isProvincialSlug("mar-del-plata")).toBe(false)
  })

  it("resolveProvinceFromAddress no resuelve 'Buenos Aires' ambiguo sin contexto", () => {
    expect(resolveProvinceFromAddress("Av. Corrientes 1234, Buenos Aires")).toBeUndefined()
    expect(resolveProvinceFromAddress("Calle 1, Buenos Aires")).toBeUndefined()
  })

  it("resolveProvinceFromAddress resuelve señales inequívocas", () => {
    expect(resolveProvinceFromAddress("Calle 1, La Plata, Provincia de Buenos Aires")?.slug).toBe("buenos-aires")
    expect(resolveProvinceFromAddress("Av. Mitre 100, San Miguel de Tucumán, Tucumán")?.slug).toBe("tucuman")
    expect(resolveProvinceFromAddress("Av. Colón 200, Córdoba, Córdoba")?.slug).toBe("cordoba")
  })

  it("resolveProvinceFromAddress resuelve por último segmento cuando es inequívoco", () => {
    expect(resolveProvinceFromAddress("Av. San Martín 300, Mendoza")?.slug).toBe("mendoza")
    expect(resolveProvinceFromAddress("Calle 5, Salta")?.slug).toBe("salta")
  })
})