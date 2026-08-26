export type AndroidBackAction =
  | "close-more-filters"
  | "close-place-sheet"
  | "close-overlay"
  | "close-map-list"
  | "history-back"
  | "minimize"

export type AndroidMapBackHandlers = {
  moreFiltersOpen: boolean
  placeSheetOpen: boolean
  closeMoreFilters: () => void
  closePlaceSheet: () => void
}

let mapBackHandlers: AndroidMapBackHandlers | null = null

/** MapMobile registers explicit close callbacks. Web/iOS never call executeAndroidBack. */
export function registerAndroidMapBackHandlers(
  handlers: AndroidMapBackHandlers | null
): void {
  mapBackHandlers = handlers
}

export function getAndroidMapBackHandlers(): AndroidMapBackHandlers | null {
  return mapBackHandlers
}

export function isMapListOpenFromHref(href: string): boolean {
  try {
    const url = new URL(href, "https://www.celimap.com.ar")
    return url.searchParams.get("list") === "open"
  } catch {
    return false
  }
}

export function stripMapListFromHref(href: string): string {
  const url = new URL(href, "https://www.celimap.com.ar")
  url.searchParams.delete("list")
  return `${url.pathname}${url.search}${url.hash}`
}

export function hasOpenOverlay(root: ParentNode | Document = document): boolean {
  return Boolean(
    root.querySelector('[role="dialog"][data-state="open"]') ||
      root.querySelector('[data-radix-dialog-content][data-state="open"]')
  )
}

export function tryCloseOpenOverlay(root: Document = document): boolean {
  if (!hasOpenOverlay(root)) return false
  root.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    })
  )
  return true
}

export function decideAndroidBack(input: {
  moreFiltersOpen?: boolean
  placeSheetOpen?: boolean
  overlayOpen: boolean
  mapListOpen: boolean
  canGoBack: boolean
}): AndroidBackAction {
  if (input.moreFiltersOpen) return "close-more-filters"
  if (input.placeSheetOpen) return "close-place-sheet"
  if (input.overlayOpen) return "close-overlay"
  if (input.mapListOpen) return "close-map-list"
  if (input.canGoBack) return "history-back"
  return "minimize"
}

export function executeAndroidBack(args: {
  canGoBack: boolean
  href: string
  overlayRoot?: Document
  onCloseMapList: (path: string) => void
  onHistoryBack: () => void
  onMinimize: () => void
}): AndroidBackAction {
  const handlers = mapBackHandlers
  const action = decideAndroidBack({
    moreFiltersOpen: Boolean(handlers?.moreFiltersOpen),
    placeSheetOpen: Boolean(handlers?.placeSheetOpen),
    overlayOpen: hasOpenOverlay(args.overlayRoot ?? document),
    mapListOpen: isMapListOpenFromHref(args.href),
    canGoBack: args.canGoBack,
  })

  switch (action) {
    case "close-more-filters":
      handlers?.closeMoreFilters()
      break
    case "close-place-sheet":
      handlers?.closePlaceSheet()
      break
    case "close-overlay":
      tryCloseOpenOverlay(args.overlayRoot ?? document)
      break
    case "close-map-list":
      args.onCloseMapList(stripMapListFromHref(args.href))
      break
    case "history-back":
      args.onHistoryBack()
      break
    case "minimize":
      args.onMinimize()
      break
  }

  return action
}
