/**
 * @jest-environment jsdom
 */
import {
  decideAndroidBack,
  executeAndroidBack,
  getAndroidMapBackHandlers,
  hasOpenOverlay,
  isMapListOpenFromHref,
  registerAndroidMapBackHandlers,
  stripMapListFromHref,
  tryCloseOpenOverlay,
} from "@/lib/native-android-back"

function emptyExecDeps() {
  return {
    onCloseMapList: jest.fn(),
    onHistoryBack: jest.fn(),
    onMinimize: jest.fn(),
  }
}

describe("native android back", () => {
  afterEach(() => {
    registerAndroidMapBackHandlers(null)
  })

  it("Radix overlay abierto → close-overlay", () => {
    expect(
      decideAndroidBack({
        overlayOpen: true,
        mapListOpen: true,
        canGoBack: true,
      })
    ).toBe("close-overlay")
  })

  it("More Filters abierto → close-more-filters", () => {
    expect(
      decideAndroidBack({
        moreFiltersOpen: true,
        placeSheetOpen: true,
        overlayOpen: true,
        mapListOpen: true,
        canGoBack: true,
      })
    ).toBe("close-more-filters")
  })

  it("Place sheet abierto → close-place-sheet", () => {
    expect(
      decideAndroidBack({
        moreFiltersOpen: false,
        placeSheetOpen: true,
        overlayOpen: true,
        mapListOpen: true,
        canGoBack: true,
      })
    ).toBe("close-place-sheet")
  })

  it("ningún overlay + history → history-back", () => {
    expect(
      decideAndroidBack({
        overlayOpen: false,
        mapListOpen: false,
        canGoBack: true,
      })
    ).toBe("history-back")
  })

  it("root → minimize", () => {
    expect(
      decideAndroidBack({
        overlayOpen: false,
        mapListOpen: false,
        canGoBack: false,
      })
    ).toBe("minimize")
  })

  it("cierra lista mapa si no hay overlay ni sheets", () => {
    expect(
      decideAndroidBack({
        overlayOpen: false,
        mapListOpen: true,
        canGoBack: true,
      })
    ).toBe("close-map-list")
  })

  it("parsea ?list=open", () => {
    expect(isMapListOpenFromHref("https://www.celimap.com.ar/mapa?list=open")).toBe(
      true
    )
    expect(isMapListOpenFromHref("/mapa")).toBe(false)
    expect(stripMapListFromHref("https://www.celimap.com.ar/mapa?list=open&q=1")).toBe(
      "/mapa?q=1"
    )
  })

  it("tryCloseOpenOverlay no-op sin dialog", () => {
    expect(hasOpenOverlay()).toBe(false)
    expect(tryCloseOpenOverlay()).toBe(false)
  })

  it("tryCloseOpenOverlay dispara Escape si hay dialog abierto", () => {
    const dialog = document.createElement("div")
    dialog.setAttribute("role", "dialog")
    dialog.setAttribute("data-state", "open")
    document.body.appendChild(dialog)
    const keys: string[] = []
    const onKey = (e: KeyboardEvent) => keys.push(e.key)
    document.addEventListener("keydown", onKey)
    expect(tryCloseOpenOverlay()).toBe(true)
    expect(keys).toContain("Escape")
    document.removeEventListener("keydown", onKey)
    dialog.remove()
  })

  it("iOS/Web: register handlers no dispara close solo", () => {
    const closeMoreFilters = jest.fn()
    const closePlaceSheet = jest.fn()
    registerAndroidMapBackHandlers({
      moreFiltersOpen: true,
      placeSheetOpen: true,
      closeMoreFilters,
      closePlaceSheet,
    })
    expect(closeMoreFilters).not.toHaveBeenCalled()
    expect(closePlaceSheet).not.toHaveBeenCalled()
    expect(getAndroidMapBackHandlers()?.moreFiltersOpen).toBe(true)
  })

  it("Back no ejecuta dos acciones en un mismo evento", () => {
    const closeMoreFilters = jest.fn()
    const closePlaceSheet = jest.fn()
    registerAndroidMapBackHandlers({
      moreFiltersOpen: true,
      placeSheetOpen: true,
      closeMoreFilters,
      closePlaceSheet,
    })
    const deps = emptyExecDeps()
    const action = executeAndroidBack({
      canGoBack: true,
      href: "https://www.celimap.com.ar/mapa?list=open",
      ...deps,
    })
    expect(action).toBe("close-more-filters")
    expect(closeMoreFilters).toHaveBeenCalledTimes(1)
    expect(closePlaceSheet).not.toHaveBeenCalled()
    expect(deps.onCloseMapList).not.toHaveBeenCalled()
    expect(deps.onHistoryBack).not.toHaveBeenCalled()
    expect(deps.onMinimize).not.toHaveBeenCalled()
  })

  it("executeAndroidBack cierra place sheet y no history", () => {
    const closeMoreFilters = jest.fn()
    const closePlaceSheet = jest.fn()
    registerAndroidMapBackHandlers({
      moreFiltersOpen: false,
      placeSheetOpen: true,
      closeMoreFilters,
      closePlaceSheet,
    })
    const deps = emptyExecDeps()
    expect(
      executeAndroidBack({
        canGoBack: true,
        href: "https://www.celimap.com.ar/mapa",
        ...deps,
      })
    ).toBe("close-place-sheet")
    expect(closePlaceSheet).toHaveBeenCalledTimes(1)
    expect(closeMoreFilters).not.toHaveBeenCalled()
    expect(deps.onHistoryBack).not.toHaveBeenCalled()
  })
})
