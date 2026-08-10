/**
 * @jest-environment jsdom
 */
import React from "react"
import { act } from "react"
import { createRoot, Root } from "react-dom/client"
import fs from "fs"
import path from "path"
import { LIST_VISIBILITY } from "@/lib/lists/constants"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { PrivateGuideAccordionItem } from "@/components/lists/PrivateGuideAccordionItem"
import type { IPlace } from "@/models/Place"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const fitAllPlaces = jest.fn()
const lastMapProps: { current: Record<string, unknown> | null } = {
  current: null,
}

jest.mock("next/dynamic", () => () => {
  const MockMap = (props: Record<string, unknown>) => {
    lastMapProps.current = props
    if (props.mapRefOuter && typeof props.mapRefOuter === "object") {
      ;(props.mapRefOuter as { current: unknown }).current = { fitAllPlaces }
    }
    return (
      <div data-testid="private-list-map-mock" data-active={String(props.activePlaceId ?? "")} />
    )
  }
  MockMap.displayName = "PrivateListMapMock"
  return MockMap
})

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string }) =>
    React.createElement("img", { alt: props.alt ?? "" }),
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
  }) => React.createElement("a", { href, ...rest }, children),
}))

import { PrivateListClientView } from "@/components/lists/PrivateListClientView"

function placeFixture(partial: {
  _id: string
  name: string
  [key: string]: unknown
}): IPlace {
  return {
    types: ["store"],
    type: "store",
    address: "Av. Fake 123",
    neighborhood: "Recoleta",
    tags: ["100_gf"],
    safetyLevel: "dedicated_gf",
    location: { lat: -34.59, lng: -58.39 },
    photos: [],
    ...partial,
  } as unknown as IPlace
}

function mount(ui: React.ReactElement): { root: Root; el: HTMLDivElement } {
  const el = document.createElement("div")
  document.body.appendChild(el)
  const root = createRoot(el)
  act(() => {
    root.render(ui)
  })
  return { root, el }
}

describe("Private guide UX", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
    fitAllPlaces.mockClear()
    lastMapProps.current = null
  })

  it("acordeones empiezan cerrados, título visible, sin nombre duplicado", () => {
    const place = placeFixture({ _id: "p1", name: "Celigourmet" })
    const { el, root } = mount(
      <PrivateGuideAccordionItem
        place={place}
        order={1}
        creatorName="Celíacos Viajeros"
        open={false}
        active={false}
        onToggle={() => {}}
      />
    )
    const nameNodes = Array.from(el.querySelectorAll("*")).filter(
      (n) => n.childNodes.length === 1 && n.textContent === "Celigourmet"
    )
    expect(nameNodes.length).toBe(1)
    expect(el.textContent).toContain("Celigourmet")
    expect(el.textContent).toContain("Recoleta")
    expect(el.querySelector('[aria-expanded="false"]')).toBeTruthy()
    expect(el.querySelector("#guide-panel-p1")?.hasAttribute("hidden")).toBe(
      true
    )
    expect(el.querySelector("#guide-panel-p1")?.getAttribute("hidden")).not.toBe(
      null
    )
    // Nombre una sola vez en el árbol visible del header
    const headerText = el.querySelector("button[aria-controls]")?.textContent ?? ""
    expect(headerText.match(/Celigourmet/g)?.length).toBe(1)
    act(() => {
      root.unmount()
    })
  })

  it("solo un acordeón abierto y sync activePlaceId ↔ mapa", async () => {
    const places = [
      placeFixture({ _id: "a", name: "Uno" }),
      placeFixture({ _id: "b", name: "Dos" }),
    ]
    const list: ListWithDetails = {
      _id: "list1",
      name: "Guía BA",
      isPublic: false,
      visibility: LIST_VISIBILITY.PRIVATE_LINK,
      likesCount: 0,
      createdBy: { _id: "u", name: "Celíacos Viajeros" },
      placeIds: places as unknown as ListWithDetails["placeIds"],
    }

    const { el, root } = mount(<PrivateListClientView list={list} />)

    expect(el.querySelectorAll('[aria-expanded="true"]')).toHaveLength(0)
    expect(el.querySelectorAll('[aria-expanded="false"]')).toHaveLength(2)

    const headers = el.querySelectorAll("button[aria-controls]")
    await act(async () => {
      ;(headers[0] as HTMLButtonElement).click()
    })
    expect(el.querySelectorAll('[aria-expanded="true"]')).toHaveLength(1)
    expect(lastMapProps.current?.activePlaceId).toBe("a")

    await act(async () => {
      ;(headers[1] as HTMLButtonElement).click()
    })
    expect(el.querySelectorAll('[aria-expanded="true"]')).toHaveLength(1)
    expect(
      el.querySelector('#guide-header-b')?.getAttribute("aria-expanded")
    ).toBe("true")
    expect(lastMapProps.current?.activePlaceId).toBe("b")

    // Re-clic cierra acordeón sin exigir limpiar selección (spec)
    await act(async () => {
      ;(headers[1] as HTMLButtonElement).click()
    })
    expect(
      el.querySelector('#guide-header-b')?.getAttribute("aria-expanded")
    ).toBe("false")
    expect(lastMapProps.current?.activePlaceId).toBe("b")

    const verTodos = Array.from(el.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Ver todos en el mapa")
    )
    await act(async () => {
      verTodos?.click()
    })
    expect(fitAllPlaces).toHaveBeenCalled()
    expect(el.querySelectorAll('[aria-expanded="true"]')).toHaveLength(0)

    // No monta PlaceCard / popup público en esta vista
    expect(el.innerHTML).not.toMatch(/PlaceCard|celimap-popup|Favorito/)
    expect(el.querySelector(".overflow-x-hidden")).toBeTruthy()

    act(() => {
      root.unmount()
    })
  })

  it("números de orden 1..n y modo private-guide en MapboxMap", () => {
    const mapSrc = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapboxMap.tsx"),
      "utf8"
    )
    expect(mapSrc).toContain('interactionMode === "private-guide"')
    expect(mapSrc).toContain("effectiveShowPopup = isPrivateGuide ? false")
    expect(mapSrc).toContain("mapNums.set(id, index + 1)")
    expect(mapSrc).toContain("fitAllPlaces")
    // Mapa público: default sin private-guide
    expect(mapSrc).toContain('interactionMode = "default"')
    expect(mapSrc).toContain("showPopup = true")

    const wrap = fs.readFileSync(
      path.join(process.cwd(), "components/lists/PrivateListMap.tsx"),
      "utf8"
    )
    expect(wrap).toContain('interactionMode="private-guide"')
    expect(wrap).not.toMatch(/window\.location|pathname/)
  })

  it("mapa público no fuerza private-guide por URL", () => {
    const consumers = [
      "components/map-view/MapView.tsx",
      "components/map-view/MapPageClient.tsx",
      "app/(main)/mapa/page.tsx",
    ]
    for (const rel of consumers) {
      const full = path.join(process.cwd(), rel)
      if (!fs.existsSync(full)) continue
      const src = fs.readFileSync(full, "utf8")
      expect(src).not.toContain('interactionMode="private-guide"')
    }
  })
})
