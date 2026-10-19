/**
 * @jest-environment jsdom
 */
import React, { act } from "react"
import { createRoot } from "react-dom/client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const renders: string[] = []
jest.mock("@/components/map-view/PlaceMiniCard", () => {
  const ReactActual = jest.requireActual("react") as typeof React
  return {
    PlaceMiniCard: ReactActual.memo(function Stub({ place }: { place: { _id: string; name: string } }) {
      renders.push(place._id)
      return ReactActual.createElement("article", { "data-card": place._id }, place.name)
    }),
  }
})

type IOCallback = (entries: Array<{ isIntersecting: boolean }>) => void
const observers: Array<{ cb: IOCallback; targets: Element[] }> = []
class FakeIntersectionObserver {
  targets: Element[] = []
  constructor(public cb: IOCallback) {
    observers.push(this)
  }
  observe(el: Element) {
    this.targets.push(el)
  }
  disconnect() {
    this.targets = []
  }
}
;(globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeIntersectionObserver
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
})) as unknown as typeof window.matchMedia
Element.prototype.scrollIntoView = function scrollIntoView() {}

import { PlacesList } from "@/components/map-view/PlacesList"

function places(n: number, offset = 0) {
  return Array.from({ length: n }, (_, i) => ({
    _id: `p${i + offset}`,
    name: `Lugar ${i + offset}`,
    location: { lat: -34.6, lng: -58.4 },
  })) as never[]
}

describe("PlacesList", () => {
  beforeEach(() => {
    renders.length = 0
    observers.length = 0
  })

  it("dibuja 30, y suma 30 más cuando se ve el final", () => {
    const el = document.createElement("div")
    const root = createRoot(el)
    act(() => root.render(<PlacesList places={places(100)} selectedPlaceId={null} />))
    expect(el.querySelectorAll("[data-card]")).toHaveLength(30)
    expect(el.querySelectorAll("[data-list-tail]")).toHaveLength(8)
    const active = observers.filter((o) => o.targets.length > 0).at(-1)!
    act(() => active.cb([{ isIntersecting: true }]))
    expect(el.querySelectorAll("[data-card]")).toHaveLength(60)
    act(() => root.unmount())
  })

  it("la tarjeta seleccionada se dibuja aunque esté más abajo", () => {
    const el = document.createElement("div")
    const root = createRoot(el)
    act(() => root.render(<PlacesList places={places(100)} selectedPlaceId="p70" />))
    expect(el.querySelector('[data-card="p70"]')).not.toBeNull()
    act(() => root.unmount())
  })

  it("con key estable, una página nueva no vuelve a dibujar las tarjetas que ya estaban", () => {
    const el = document.createElement("div")
    const root = createRoot(el)
    const first = places(10)
    act(() => root.render(<PlacesList places={first} selectedPlaceId={null} />))
    renders.length = 0
    act(() => root.render(<PlacesList places={[...first, ...places(5, 10)]} selectedPlaceId={null} />))
    expect(renders.sort()).toEqual(["p10", "p11", "p12", "p13", "p14"])
    act(() => root.unmount())
  })
})
