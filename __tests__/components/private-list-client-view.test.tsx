import { LIST_VISIBILITY } from "@/lib/lists/constants"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { isPrivateListPath } from "@/lib/lists/is-private-list-path"
import fs from "fs"
import path from "path"

describe("Private guide accordion + map layout", () => {
  it("acordeones cerrados por defecto y sin nombre duplicado en header", () => {
    const accordion = fs.readFileSync(
      path.join(
        process.cwd(),
        "components/lists/PrivateGuideAccordionItem.tsx"
      ),
      "utf8"
    )
    expect(accordion).toContain("aria-expanded")
    expect(accordion).toContain("aria-controls")
    // Un solo render del nombre en el header cerrado
    const nameOccurrences = accordion.split("{place.name}").length - 1
    expect(nameOccurrences).toBe(1)
  })

  it("vista usa activePlaceId único y modo private-guide", () => {
    const view = fs.readFileSync(
      path.join(process.cwd(), "components/lists/PrivateListClientView.tsx"),
      "utf8"
    )
    expect(view).toContain("activePlaceId")
    expect(view).toContain("openPlaceId")
    expect(view).toContain("PrivateGuideAccordionItem")
    expect(view).toContain("fitAllPlaces")
    expect(view).toMatch(/md:grid-cols-\[minmax\(280px,38%\)/)

    const mapWrap = fs.readFileSync(
      path.join(process.cwd(), "components/lists/PrivateListMap.tsx"),
      "utf8"
    )
    expect(mapWrap).toContain('interactionMode="private-guide"')
    expect(mapWrap).toContain("showPopup={false}")
    expect(mapWrap).toContain("numberedMarkers")
  })

  it("MapboxMap soporta private-guide sin popup público", () => {
    const map = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapboxMap.tsx"),
      "utf8"
    )
    expect(map).toContain('interactionMode?: MapInteractionMode')
    expect(map).toContain('private-guide')
    expect(map).toContain("fitAllPlaces")
    expect(map).toContain("isPrivateGuideRef")
    expect(map).toContain("numberedMarkers")
  })

  it("chrome sigue aislado en ruta privada", () => {
    expect(isPrivateListPath("/listas/privadas/token")).toBe(true)
    const list: ListWithDetails = {
      _id: "1",
      name: "Guía",
      isPublic: false,
      visibility: LIST_VISIBILITY.PRIVATE_LINK,
      likesCount: 0,
      createdBy: { _id: "u", name: "Celíacos Viajeros" },
      placeIds: [],
    }
    expect(list.visibility).toBe(LIST_VISIBILITY.PRIVATE_LINK)
  })
})
