import {
  parseSintaccAmbaKml,
  mapComercioToType,
  mapSafetyAndTags,
  inferTagsFromFreeText,
  inferTypeFromFreeText,
} from "@/lib/kml-sintacc/parse"

describe("parseSintaccAmbaKml", () => {
  const sample = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Mapa de AMBA - Sintaccto.com</name>
    <Folder>
      <name>Ciudad de Buenos Aires</name>
      <Placemark>
        <name>Panadería Test</name>
        <description><![CDATA[-Tipo de comercio: Panadería<br><br>-Modalidad: Salón / Take away / Delivery<br><br>-Materia prima: Certificada sin TACC<br><br>-Cocina: Cocina 100% libre de gluten<br><br>-Horarios de atención:<br>Lunes - 9 a 18 horas<br>Martes - 9 a 18 horas<br><br>Instagram: @panatest<br><br>Nombre: ]]></description>
        <Point>
          <coordinates>-58.41,-34.59,0</coordinates>
        </Point>
      </Placemark>
      <Placemark>
        <name>Restobar Mixto</name>
        <description><![CDATA[-Tipo de comercio: Restobar<br><br>-Modalidad: Salón<br><br>-Nivel de cuidados: Cocina mixta con cuidados en contaminación cruzada<br><br>Nombre: ]]></description>
        <Point>
          <coordinates>-58.40,-34.60,0</coordinates>
        </Point>
      </Placemark>
    </Folder>
  </Document>
</kml>`

  it("parsea placemarks, tags y contact", () => {
    const result = parseSintaccAmbaKml(sample)
    expect(result.places).toHaveLength(2)
    expect(result.folders).toEqual(["Ciudad de Buenos Aires"])

    const pan = result.places[0]
    expect(pan.name).toBe("Panadería Test")
    expect(pan.type).toBe("bakery")
    expect(pan.location).toEqual({ lat: -34.59, lng: -58.41 })
    expect(pan.tags).toEqual(expect.arrayContaining(["100_gf", "certificado_sin_tacc"]))
    expect(pan.safetyLevel).toBe("dedicated_gf")
    expect(pan.contact?.instagram).toBe("@panatest")
    expect(pan.delivery?.available).toBe(true)
    expect(pan.openingHours).toContain("Lunes")
    expect(pan.province).toBe("caba")
    expect(pan.source).toBe("kml")

    const mix = result.places[1]
    expect(mix.type).toBe("restaurant")
    expect(mix.tags).toContain("opciones_sin_tacc")
    expect(mix.safetyLevel).toBe("gf_options")
  })

  it("geography Costa + texto libre", () => {
    const xml = `<?xml version="1.0"?><kml><Document><name>Costa</name>
      <Folder><name>Mar del Plata</name>
      <Placemark><name>Test MDQ</name>
      <description><![CDATA[Opciones sin TACC]]></description>
      <Point><coordinates>-57.54,-38.00,0</coordinates></Point>
      </Placemark></Folder></Document></kml>`
    const result = parseSintaccAmbaKml(xml)
    expect(result.places[0].province).toBe("buenos-aires")
    expect(result.places[0].locality).toBe("mar-del-plata")
    expect(result.places[0].tags).toContain("opciones_sin_tacc")
  })
})

describe("mapComercioToType / mapSafetyAndTags", () => {
  it("mapea tipos comunes", () => {
    expect(mapComercioToType("Cafetería")).toBe("cafe")
    expect(mapComercioToType("Hamburguesería")).toBe("restaurant")
    expect(mapComercioToType("Fábrica de pastas")).toBe("store")
    expect(mapComercioToType("Heladería")).toBe("icecream")
  })

  it("no marca dedicated solo por materia certificada", () => {
    const r = mapSafetyAndTags(
      "Cocina mixta con cuidados en contaminación cruzada",
      "Certificada sin TACC"
    )
    expect(r.tags).toEqual(
      expect.arrayContaining(["opciones_sin_tacc", "certificado_sin_tacc"])
    )
    expect(r.safetyLevel).toBe("gf_options")
  })

  it("infiere tipo y tags desde texto libre Costa", () => {
    expect(
      inferTypeFromFreeText("2D Cafe", "Cuentan con opciones sin TACC", undefined)
    ).toBe("cafe")
    const tags = inferTagsFromFreeText(
      "Cuentan con opciones sin TACC según informa la web de Turismo"
    )
    expect(tags.tags).toContain("opciones_sin_tacc")
    expect(tags.safetyLevel).toBe("gf_options")
  })
})
