import fs from "fs"
import path from "path"

describe("popup mapa responsive", () => {
  it("desktop usa popover anclado, no bottom sheet", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapDesktop.tsx"),
      "utf8"
    )
    expect(src).toContain("DesktopMapPopover")
    expect(src).toContain("onBackgroundClick")
    expect(src).not.toContain("MobileMapBottomSheet")
    expect(src).not.toContain("PlaceSelectedCard")
  })

  it("mobile usa bottom sheet y esconde el listado al seleccionar", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapMobile.tsx"),
      "utf8"
    )
    expect(src).toContain("MobileMapBottomSheet")
    expect(src).toContain("onBackgroundClick")
    expect(src).toContain("if (listOpen) onSheetCollapse?.()")
    expect(src).toContain("listOpen && !selectedPlace")
    expect(src).not.toContain("PlaceSelectedCard")
  })

  it("popover desktop cierra con ESC y card es link", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/DesktopMapPopover.tsx"),
      "utf8"
    )
    expect(src).toContain('event.key === "Escape"')
    expect(src).toContain("getPlaceDetailPath")
    expect(src).toContain('data-directions="true"')
    expect(src).not.toContain("<img")
  })

  it("sheet mobile compacto 132px y swipe cierra", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MobileMapBottomSheet.tsx"),
      "utf8"
    )
    expect(src).toContain("MOBILE_SHEET_COMPACT_PX = 132")
    expect(src).toContain("CLOSE_THRESHOLD_PX")
    expect(src).toContain('data-directions="true"')
    expect(src).toContain("getPlaceDetailPath")
  })

  it("lista mobile cream, sin FAB encima de cards", () => {
    const sheet = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/BottomSheet.tsx"),
      "utf8"
    )
    const mobile = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapMobile.tsx"),
      "utf8"
    )
    const card = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/PlaceMiniCard.tsx"),
      "utf8"
    )
    expect(sheet).toContain("#F8F5EF")
    expect(sheet).not.toContain("bg-black/70")
    expect(mobile).toContain("{!listOpen && (")
    expect(mobile).toContain("<FabButtons")
    expect(mobile).not.toContain("18vh")
    expect(card).not.toContain("getPlaceImageUrl")
  })
})
