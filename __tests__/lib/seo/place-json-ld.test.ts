/**
 * @jest-environment node
 *
 * JSON-LD de la ficha: horario válido (OpeningHoursSpecification) y texto de
 * la base escapado dentro del <script>.
 */
import { readFileSync } from "fs"
import path from "path"
import React from "react"
import { TextEncoder, TextDecoder } from "util"
import { toOpeningHoursSpecification } from "@/lib/opening-hours"
import { serializeJsonLd } from "@/lib/seo/json-ld"

Object.assign(globalThis, { TextEncoder, TextDecoder })
const { renderToStaticMarkup } = require("react-dom/server") as typeof import("react-dom/server")
const { PlaceJsonLd } = require("@/components/seo/PlaceJsonLd") as typeof import("@/components/seo/PlaceJsonLd")

const root = path.join(__dirname, "../../..")
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8")

describe("toOpeningHoursSpecification", () => {
  it("formato canónico con doble turno y día cerrado", () => {
    expect(
      toOpeningHoursSpecification("Lun–Vie 08:00–12:30 y 16:00–20:00; Sáb 08:00–12:00; Dom cerrado")
    ).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "08:00",
        closes: "12:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "16:00",
        closes: "20:00",
      },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday"], opens: "08:00", closes: "12:00" },
    ])
  })

  it("\"Domingo a domingo\" es toda la semana y el cierre de madrugada queda antes que la apertura", () => {
    expect(toOpeningHoursSpecification("Domingo a domingo 08:00–01:00")).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "08:00",
        closes: "01:00",
      },
    ])
  })

  it("24 horas es 00:00–23:59", () => {
    expect(toOpeningHoursSpecification("24 horas")).toEqual([
      expect.objectContaining({ opens: "00:00", closes: "23:59" }),
    ])
    expect(toOpeningHoursSpecification("24 horas")?.[0].dayOfWeek).toHaveLength(7)
  })

  it("horario de Google con a. m./p. m.", () => {
    expect(toOpeningHoursSpecification("lunes: 7:00 – 11:00 p.m.")).toEqual([
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday"], opens: "19:00", closes: "23:00" },
    ])
  })

  it("si no se puede interpretar, no inventa", () => {
    expect(toOpeningHoursSpecification(undefined)).toBeNull()
    expect(toOpeningHoursSpecification("")).toBeNull()
    expect(toOpeningHoursSpecification("Consultar por Instagram")).toBeNull()
    expect(toOpeningHoursSpecification("Cerrado")).toBeNull()
  })
})

describe("serializeJsonLd", () => {
  it("escapa lo que podría cerrar el <script> y el JSON sigue igual", () => {
    const data = { name: '</script><script>alert(1)</script> & "x" ' }
    const out = serializeJsonLd(data)
    expect(out).not.toContain("<")
    expect(out).not.toContain(">")
    expect(out).not.toContain(" ")
    expect(JSON.parse(out)).toEqual(data)
  })
})

describe("<PlaceJsonLd>", () => {
  const place = {
    _id: "1",
    slug: "pain-du-jour-palermo",
    name: "Pain du Jour </script><b>",
    type: "bakery",
    neighborhood: "Palermo",
    tags: ["100_gf"],
    safetyLevel: "dedicated_gf" as const,
    openingHours: "Lun–Vie 08:00–20:00; Sáb 09:00–13:00; Dom cerrado",
  }

  function schemas(html: string) {
    return Array.from(html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)).map((m) =>
      JSON.parse(m[1])
    )
  }

  it("manda openingHoursSpecification y no el texto libre", () => {
    const [business] = schemas(renderToStaticMarkup(React.createElement(PlaceJsonLd, { place })))
    expect(business.openingHours).toBeUndefined()
    expect(business.openingHoursSpecification).toEqual([
      expect.objectContaining({ dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "20:00" }),
      expect.objectContaining({ dayOfWeek: ["Saturday"], opens: "09:00", closes: "13:00" }),
    ])
  })

  it("sin horario interpretable no manda horario", () => {
    const [business] = schemas(
      renderToStaticMarkup(React.createElement(PlaceJsonLd, { place: { ...place, openingHours: "Consultar" } }))
    )
    expect(business.openingHours).toBeUndefined()
    expect(business.openingHoursSpecification).toBeUndefined()
  })

  it("un nombre con </script> no cierra el script", () => {
    const html = renderToStaticMarkup(React.createElement(PlaceJsonLd, { place }))
    expect(html.match(/<\/script>/g)).toHaveLength(2)
    const [business] = schemas(html)
    expect(business.name).toBe("Pain du Jour </script><b>")
  })
})

describe("JSON-LD con datos de la base usa serializeJsonLd", () => {
  it.each([
    "components/seo/PlaceJsonLd.tsx",
    "components/seo/CityPageJsonLd.tsx",
    "components/seo/ProvincePageJsonLd.tsx",
    "components/seo/ProvinceCategoryPageJsonLd.tsx",
    "components/seo/ArgentinaLandingJsonLd.tsx",
    "components/seo/VentureJsonLd.tsx",
    "components/seo/VentureBreadcrumbJsonLd.tsx",
    "app/listas/[id]/layout.tsx",
  ])("%s", (rel) => {
    const src = read(rel)
    expect(src).toContain("__html: serializeJsonLd(")
    expect(src).not.toContain("__html: JSON.stringify(")
  })
})
