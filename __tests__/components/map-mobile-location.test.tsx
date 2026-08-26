/**
 * @jest-environment jsdom
 */
import React, { act } from "react"
import { createRoot, type Root } from "react-dom/client"

jest.mock("@vercel/analytics", () => ({
  track: jest.fn(),
}))

const mockGetLocationAutoEnabled = jest.fn(() => false)
const mockSetLocationAutoEnabled = jest.fn()
const mockClearLocationAutoEnabled = jest.fn()

jest.mock("@/lib/location-preference", () => ({
  getLocationAutoEnabled: () => mockGetLocationAutoEnabled(),
  setLocationAutoEnabled: (enabled: boolean) => mockSetLocationAutoEnabled(enabled),
  clearLocationAutoEnabled: () => mockClearLocationAutoEnabled(),
}))

jest.mock("@/components/map-view/PlacesList", () => ({
  PlacesList: () => React.createElement("div"),
}))

jest.mock("@/components/map-view/MobileMapBottomSheet", () => ({
  MobileMapBottomSheet: () => React.createElement("div"),
  MOBILE_SHEET_COMPACT_PX: 120,
}))

jest.mock("@/components/map-view/BottomSheet", () => ({
  MapBottomSheet: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}))

import { MapMobile } from "@/components/map-view/MapMobile"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const mockShowUserLocation = jest.fn()
const mockFlyTo = jest.fn()

jest.mock("mapbox-gl", () => ({
  __esModule: true,
  default: {
    LngLatBounds: class LngLatBounds {},
  },
}))

jest.mock("@/components/map-view/MapboxMap", () => {
  const React = require("react")
  return {
    MapboxMap: React.forwardRef(function MockMapboxMap(_props: unknown, ref: React.Ref<unknown>) {
      React.useImperativeHandle(ref, () => ({
        showUserLocation: mockShowUserLocation,
        flyTo: mockFlyTo,
        triggerGeolocate: jest.fn(),
      }))
      return React.createElement("div", { "data-testid": "mock-mapbox" })
    }),
  }
})

jest.mock("@/components/map-view/MapErrorBoundary", () => ({
  MapErrorBoundary: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}))

jest.mock("@/components/map-view/MapTopBar", () => ({
  MapTopBar: () => React.createElement("div"),
}))

jest.mock("@/components/map-view/FabButtons", () => ({
  FabButtons: ({ onNearMe }: { onNearMe: () => void }) =>
    React.createElement(
      "button",
      { type: "button", "data-testid": "near-me-fab", onClick: onNearMe },
      "Near me"
    ),
}))

jest.mock("@/components/map-view/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: () => false,
}))

jest.mock("@/lib/native-android-back", () => ({
  registerAndroidMapBackHandlers: jest.fn(),
}))

jest.mock("sonner", () => ({
  toast: {
    loading: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  },
}))

const baseProps = {
  places: [],
  loading: false,
  filters: { search: "", tags: [] as string[] },
  onFiltersChange: jest.fn(),
  onSearchChange: jest.fn(),
  selectedPlaceId: null,
  onPlaceSelect: jest.fn(),
}

function mockGeolocation(
  impl: (
    success: PositionCallback,
    error?: PositionErrorCallback
  ) => void
) {
  Object.defineProperty(global.navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: jest.fn(impl),
    },
  })
}

async function mountMapMobile(): Promise<{ root: Root; el: HTMLDivElement }> {
  const el = document.createElement("div")
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(React.createElement(MapMobile, baseProps))
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  return { root, el }
}

describe("MapMobile location auto preference", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = ""
    localStorage.clear()
    mockGetLocationAutoEnabled.mockReturnValue(false)
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    })
    mockGeolocation((success) => {
      success({
        coords: { latitude: -34.6, longitude: -58.4 },
      } as GeolocationPosition)
    })
  })

  it("preference false no auto geolocation", async () => {
    mockGetLocationAutoEnabled.mockReturnValue(false)
    await mountMapMobile()
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })

  it("preference true intenta geolocation una vez al montar", async () => {
    mockGetLocationAutoEnabled.mockReturnValue(true)
    await mountMapMobile()
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1)
    expect(mockShowUserLocation).toHaveBeenCalledWith(-58.4, -34.6)
    expect(mockFlyTo).toHaveBeenCalledWith(-58.4, -34.6, 16)
  })

  it("auto success mantiene preference true", async () => {
    mockGetLocationAutoEnabled.mockReturnValue(true)

    await mountMapMobile()

    expect(mockClearLocationAutoEnabled).not.toHaveBeenCalled()
    expect(mockSetLocationAutoEnabled).not.toHaveBeenCalled()
  })

  it("auto permission denied mantiene preference", async () => {
    mockGetLocationAutoEnabled.mockReturnValue(true)
    mockGeolocation((_success, error) => {
      error?.({
        code: 1,
        message: "denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError)
    })

    await mountMapMobile()

    expect(mockClearLocationAutoEnabled).not.toHaveBeenCalled()
    expect(mockSetLocationAutoEnabled).not.toHaveBeenCalled()
  })

  it("auto timeout mantiene preference", async () => {
    mockGetLocationAutoEnabled.mockReturnValue(true)
    mockGeolocation((_success, error) => {
      error?.({
        code: 3,
        message: "timeout",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError)
    })

    await mountMapMobile()

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled()
    expect(mockClearLocationAutoEnabled).not.toHaveBeenCalled()
  })

  it("auto position unavailable mantiene preference", async () => {
    mockGetLocationAutoEnabled.mockReturnValue(true)
    mockGeolocation((_success, error) => {
      error?.({
        code: 2,
        message: "unavailable",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError)
    })

    await mountMapMobile()

    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled()
    expect(mockClearLocationAutoEnabled).not.toHaveBeenCalled()
    expect(mockSetLocationAutoEnabled).not.toHaveBeenCalled()
  })

  it("manual permission denied no activa preference", async () => {
    mockGetLocationAutoEnabled.mockReturnValue(false)
    mockGeolocation((_success, error) => {
      error?.({
        code: 1,
        message: "denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError)
    })

    const { el } = await mountMapMobile()
    const fab = el.querySelector('[data-testid="near-me-fab"]') as HTMLButtonElement

    await act(async () => {
      fab.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockSetLocationAutoEnabled).not.toHaveBeenCalled()
    expect(mockClearLocationAutoEnabled).not.toHaveBeenCalled()
  })

  it("auto falla y usuario puede usar FAB manualmente", async () => {
    mockGetLocationAutoEnabled.mockReturnValue(true)
    const getCurrentPosition = jest.fn((_success, error) => {
      error?.({
        code: 1,
        message: "denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError)
    })
    Object.defineProperty(global.navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    })

    const { el } = await mountMapMobile()
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)

    getCurrentPosition.mockImplementation((success: PositionCallback) => {
      success({
        coords: { latitude: -34.6, longitude: -58.4 },
      } as GeolocationPosition)
    })

    const fab = el.querySelector('[data-testid="near-me-fab"]') as HTMLButtonElement
    await act(async () => {
      fab.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(getCurrentPosition).toHaveBeenCalledTimes(2)
    expect(mockShowUserLocation).toHaveBeenCalledWith(-58.4, -34.6)
    expect(mockSetLocationAutoEnabled).toHaveBeenCalledWith(true)
  })

  it("manual success guarda preference true", async () => {
    mockGetLocationAutoEnabled.mockReturnValue(false)

    const { el } = await mountMapMobile()
    const fab = el.querySelector('[data-testid="near-me-fab"]') as HTMLButtonElement

    await act(async () => {
      fab.click()
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(mockSetLocationAutoEnabled).toHaveBeenCalledWith(true)
  })

  it("remount con preference true vuelve a intentar una vez", async () => {
    mockGetLocationAutoEnabled.mockReturnValue(true)

    const first = await mountMapMobile()
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1)

    await act(async () => {
      first.root.unmount()
    })
    ;(navigator.geolocation.getCurrentPosition as jest.Mock).mockClear()

    await mountMapMobile()
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1)
  })
})
