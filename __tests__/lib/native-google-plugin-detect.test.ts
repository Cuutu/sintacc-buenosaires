/**
 * @jest-environment jsdom
 */
import { hasNativeGoogleSignInPlugin } from "@/lib/native-sign-in"

type CapacitorStub = {
  isPluginAvailable?: (name: string) => boolean
  Plugins?: Record<string, unknown>
}

function setCapacitor(stub: CapacitorStub | undefined) {
  ;(window as unknown as { Capacitor?: CapacitorStub }).Capacitor = stub
}

describe("hasNativeGoogleSignInPlugin", () => {
  afterEach(() => {
    setCapacitor(undefined)
  })

  it("false when no Capacitor bridge (web)", () => {
    setCapacitor(undefined)
    expect(hasNativeGoogleSignInPlugin()).toBe(false)
  })

  it("false on older binary without SocialLogin", () => {
    setCapacitor({
      isPluginAvailable: (name) => name !== "SocialLogin",
      Plugins: { App: {}, Browser: {} },
    })
    expect(hasNativeGoogleSignInPlugin()).toBe(false)
  })

  it("true when plugin reported available", () => {
    setCapacitor({ isPluginAvailable: (name) => name === "SocialLogin" })
    expect(hasNativeGoogleSignInPlugin()).toBe(true)
  })

  it("true via Plugins registry when isPluginAvailable throws", () => {
    setCapacitor({
      isPluginAvailable: () => {
        throw new Error("bridge error")
      },
      Plugins: { SocialLogin: {} },
    })
    expect(hasNativeGoogleSignInPlugin()).toBe(true)
  })
})
