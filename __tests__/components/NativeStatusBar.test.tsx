/**
 * @jest-environment jsdom
 */
import React from "react"
import { createRoot, Root } from "react-dom/client"
import { isNativeApp } from "@/lib/native-app"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const setOverlaysWebView = jest.fn().mockResolvedValue(undefined)
const setStyle = jest.fn().mockResolvedValue(undefined)
const setBackgroundColor = jest.fn().mockResolvedValue(undefined)

jest.mock("@/lib/native-app", () => ({
  isNativeApp: jest.fn(() => false),
}))

jest.mock("@capacitor/status-bar", () => ({
  StatusBar: {
    setOverlaysWebView: (...args: unknown[]) => setOverlaysWebView(...args),
    setStyle: (...args: unknown[]) => setStyle(...args),
    setBackgroundColor: (...args: unknown[]) => setBackgroundColor(...args),
  },
  Style: { Dark: "DARK" },
}))

import {
  NativeStatusBar,
  __resetNativeStatusBarForTests,
} from "@/components/native/NativeStatusBar"

const isNativeAppMock = isNativeApp as jest.MockedFunction<typeof isNativeApp>

function mount(ui: React.ReactElement): { root: Root; el: HTMLDivElement } {
  const el = document.createElement("div")
  document.body.appendChild(el)
  const root = createRoot(el)
  root.render(ui)
  return { root, el }
}

async function flush(ms = 50) {
  await new Promise((r) => setTimeout(r, ms))
}

describe("NativeStatusBar", () => {
  beforeEach(() => {
    __resetNativeStatusBarForTests()
    setOverlaysWebView.mockClear()
    setStyle.mockClear()
    setBackgroundColor.mockClear()
    isNativeAppMock.mockReset()
    document.body.innerHTML = ""
  })

  it("no corre en web", async () => {
    isNativeAppMock.mockReturnValue(false)
    mount(<NativeStatusBar />)
    await flush()
    expect(setOverlaysWebView).not.toHaveBeenCalled()
  })

  it("configura overlay true en nativo", async () => {
    isNativeAppMock.mockReturnValue(true)
    mount(<NativeStatusBar />)
    await flush(80)
    expect(setOverlaysWebView).toHaveBeenCalledWith({ overlay: true })
    expect(setStyle).toHaveBeenCalled()
  })

  it("no repite config tras remount si ya configured", async () => {
    isNativeAppMock.mockReturnValue(true)
    const { root, el } = mount(<NativeStatusBar />)
    await flush(80)
    expect(setOverlaysWebView).toHaveBeenCalledTimes(1)
    root.unmount()
    el.remove()
    mount(<NativeStatusBar />)
    await flush(80)
    expect(setOverlaysWebView).toHaveBeenCalledTimes(1)
  })

  it("maneja error de plugin sin romper", async () => {
    isNativeAppMock.mockReturnValue(true)
    setOverlaysWebView.mockRejectedValueOnce(new Error("plugin fail"))
    expect(() => mount(<NativeStatusBar />)).not.toThrow()
    await flush(80)
    expect(setOverlaysWebView).toHaveBeenCalled()
  })
})
