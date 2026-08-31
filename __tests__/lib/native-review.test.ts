/**
 * @jest-environment jsdom
 */
import { registerPlugin } from "@capacitor/core"
import { isNativeIosApp } from "@/lib/native-app"
import { considerInAppReview, resetNativeReviewFlightForTests } from "@/lib/native-review"

jest.mock("@capacitor/core", () => ({
  registerPlugin: jest.fn().mockReturnValue({
    consider: jest.fn(),
    debugStatus: jest.fn(),
    debugReset: jest.fn(),
    debugForce: jest.fn(),
  }),
}))

jest.mock("@/lib/native-app", () => ({
  isNativeIosApp: jest.fn(() => true),
}))

function plugin() {
  return (registerPlugin as jest.Mock).mock.results[0].value as {
    consider: jest.Mock
  }
}

describe("considerInAppReview single-flight", () => {
  beforeEach(() => {
    resetNativeReviewFlightForTests()
    ;(isNativeIosApp as jest.Mock).mockReturnValue(true)
    plugin().consider.mockReset()
    plugin().consider.mockResolvedValue({ requested: true, reason: "requested" })
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("no llama plugin si no es iOS nativo", async () => {
    ;(isNativeIosApp as jest.Mock).mockReturnValue(false)
    considerInAppReview("favorite")
    await jest.advanceTimersByTimeAsync(2000)
    expect(plugin().consider).not.toHaveBeenCalled()
  })

  it("espera 1.5s y llama consider una vez", async () => {
    considerInAppReview("favorite")
    expect(plugin().consider).not.toHaveBeenCalled()
    await jest.advanceTimersByTimeAsync(1500)
    expect(plugin().consider).toHaveBeenCalledTimes(1)
    expect(plugin().consider).toHaveBeenCalledWith({ trigger: "favorite" })
  })

  it("segunda llamada en vuelo se ignora", async () => {
    considerInAppReview("favorite")
    considerInAppReview("review")
    await jest.advanceTimersByTimeAsync(1500)
    expect(plugin().consider).toHaveBeenCalledTimes(1)
  })

  it("si ya pidió en este WebView, no vuelve a llamar", async () => {
    considerInAppReview("favorite")
    await jest.advanceTimersByTimeAsync(1500)
    considerInAppReview("review")
    await jest.advanceTimersByTimeAsync(1500)
    expect(plugin().consider).toHaveBeenCalledTimes(1)
  })

  it("si gates fallan, permite otro consider después", async () => {
    plugin().consider.mockResolvedValue({ requested: false, reason: "sessions" })
    considerInAppReview("favorite")
    await jest.advanceTimersByTimeAsync(1500)
    considerInAppReview("review")
    await jest.advanceTimersByTimeAsync(1500)
    expect(plugin().consider).toHaveBeenCalledTimes(2)
  })
})
