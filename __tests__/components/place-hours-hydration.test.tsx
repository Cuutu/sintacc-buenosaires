/**
 * @jest-environment jsdom
 *
 * La ficha /lugar es ISR: el HTML puede tener hasta 1 h. Si "Abierto/Cerrado"
 * se calcula en el render, el server (hora A) y el navegador (hora B) difieren
 * y React tira error de hidratación. Acá renderizamos en el "server" con un
 * horario cerrado e hidratamos con el lugar ya abierto.
 */
import React from "react"
import { TextEncoder, TextDecoder } from "util"
import { act } from "react"

Object.assign(globalThis, { TextEncoder, TextDecoder })
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { renderToString } = require("react-dom/server") as typeof import("react-dom/server")
const { hydrateRoot } = require("react-dom/client") as typeof import("react-dom/client")

jest.mock("@/components/lugar/PlacePrimaryActions", () => ({
  PlacePrimaryActions: () => null,
}))
jest.mock("@/components/lugar/PlaceReportCard", () => ({
  PlaceReportCard: () => null,
}))

import { PlaceHoursToggle } from "@/components/lugar/PlaceHoursToggle"
import { PlaceDesktopAside } from "@/components/lugar/PlaceDesktopAside"

const HOURS = "Lun–Vie 09:00–18:00; Sáb 10:00–14:00; Dom cerrado"
// Martes 14/10/2026: 07:00 ART (cerrado) y 10:00 ART (abierto).
const SERVER_TIME = new Date("2026-10-14T10:00:00Z")
const CLIENT_TIME = new Date("2026-10-14T13:00:00Z")

function hydrateAt(element: React.ReactElement) {
  jest.setSystemTime(SERVER_TIME)
  const html = renderToString(element)
  const container = document.createElement("div")
  container.innerHTML = html
  document.body.appendChild(container)

  jest.setSystemTime(CLIENT_TIME)
  const recoverable: unknown[] = []
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {})
  act(() => {
    hydrateRoot(container, element, {
      onRecoverableError: (error) => recoverable.push(error),
    })
  })
  const errors = consoleError.mock.calls
  consoleError.mockRestore()
  return { html, container, recoverable, errors }
}

describe("estado abierto/cerrado sin error de hidratación", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
    document.body.innerHTML = ""
  })

  it("PlaceHoursToggle: el server no renderiza el estado y el cliente lo muestra al montar", () => {
    const { html, container, recoverable, errors } = hydrateAt(<PlaceHoursToggle hours={HOURS} />)
    expect(html).not.toMatch(/Abierto|Cerrado/)
    expect(html).toContain("Horarios")
    expect(html).toContain("Ver horarios")
    expect(recoverable).toEqual([])
    expect(errors).toEqual([])
    expect(container.textContent).toContain("Abierto")
  })

  it("PlaceDesktopAside: idem", () => {
    const { html, container, recoverable, errors } = hydrateAt(
      <PlaceDesktopAside
        mapsUrl="https://maps.google.com"
        placeId="p1"
        name="Lugar"
        shareUrl="https://www.celimap.com.ar/lugar/x"
        openingHours={HOURS}
      />
    )
    expect(html).not.toMatch(/Abierto|Cerrado/)
    expect(recoverable).toEqual([])
    expect(errors).toEqual([])
    expect(container.textContent).toContain("Abierto")
  })

  it("horario no interpretable: muestra el texto tal cual, igual en server y cliente", () => {
    const { html, recoverable } = hydrateAt(<PlaceHoursToggle hours="Consultar por Instagram" />)
    expect(html).toContain("Consultar por Instagram")
    expect(recoverable).toEqual([])
  })
})
