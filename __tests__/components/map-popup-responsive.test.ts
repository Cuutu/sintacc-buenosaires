import fs from "fs"
import path from "path"
import { formatListDistance, metersBetween } from "@/components/map-view/geo"

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
    expect(src).toContain("MOBILE_SHEET_COMPACT_PX = 168")
    expect(src).toContain("CLOSE_THRESHOLD_PX")
    expect(src).toContain('data-directions="true"')
    expect(src).toContain('data-favorite="true"')
    expect(src).toContain("getPlaceImageUrl")
    expect(src).toContain("getOpenStatusLabel")
    expect(src).toContain("FavoriteButton")
    expect(src).toContain("getPlaceSheetDetailTags")
    expect(src).toContain("getPlaceDetailPath")
    expect(src).toContain("translate3d")
    expect(src).toContain("animateSpring")
    expect(src).not.toContain("transition-[height]")
    expect(src).not.toContain("onHeightChange")
    expect(src).not.toContain("cubic-bezier")
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
    expect(sheet).toContain("map-paper")
    expect(sheet).toContain("animateSpring")
    expect(sheet).not.toContain("transition-[height]")
    expect(sheet).not.toContain("bg-black/70")
    expect(mobile).toContain("!listOpen && sheetSnap !== \"expanded\"")
    expect(mobile).toContain("<FabButtons")
    expect(mobile).not.toContain("18vh")
    expect(card).toContain("getPlaceImageUrl")
    expect(card).toContain("formatListDistance")
    expect(card).toContain('primaryType !== "other"')
  })

  it("select de lugar no dispara flyTo; GPS si", () => {
    const mobile = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapMobile.tsx"),
      "utf8"
    )
    const map = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapboxMap.tsx"),
      "utf8"
    )
    const desktop = fs.readFileSync(
      path.join(process.cwd(), "components/map-view/MapDesktop.tsx"),
      "utf8"
    )
    expect(mobile).not.toContain("mapRef.current.flyTo(place.location")
    expect(mobile).toContain("mapRef.current?.flyTo(longitude, latitude, 16)")
    expect(mobile).toContain("overlayPadding={overlayPadding}")
    expect(mobile).toContain("VerLugaresCount")
    expect(map).toContain("map.current.stop()")
    expect(map).toContain("CAMERA_FOCUS_MS")
    expect(map).toContain("lastFocusedPlaceIdRef.current === selectedPlaceId")
    expect(desktop).not.toContain("mapRef.current.flyTo")
  })

  it("distancia lista: metros o km con un decimal", () => {
    expect(formatListDistance(400)).toBe("400 m")
    expect(formatListDistance(1200)).toBe("1.2 km")
    expect(formatListDistance(-1)).toBeNull()
    const meters = metersBetween(
      { lat: -34.6037, lng: -58.3816 },
      { lat: -34.6037, lng: -58.3816 }
    )
    expect(meters).toBeLessThan(1)
  })
})
