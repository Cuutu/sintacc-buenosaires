/**
 * @jest-environment jsdom
 */
import { locationPermissionDeniedCopy } from "@/lib/native-location-copy"

jest.mock("@/lib/native-app", () => ({
  isNativeAndroidApp: jest.fn(() => false),
  isNativeIosApp: jest.fn(() => false),
}))

const { isNativeAndroidApp, isNativeIosApp } = jest.requireMock(
  "@/lib/native-app"
) as {
  isNativeAndroidApp: jest.Mock
  isNativeIosApp: jest.Mock
}

describe("location permission copy", () => {
  beforeEach(() => {
    isNativeAndroidApp.mockReturnValue(false)
    isNativeIosApp.mockReturnValue(false)
  })

  it("web habla de navegador", () => {
    expect(locationPermissionDeniedCopy()).toMatch(/navegador/)
  })

  it("Android habla de Ajustes del sistema", () => {
    isNativeAndroidApp.mockReturnValue(true)
    expect(locationPermissionDeniedCopy()).toMatch(/Ajustes del sistema/)
    expect(locationPermissionDeniedCopy()).not.toMatch(/navegador/)
  })

  it("iOS nativo habla de Ajustes", () => {
    isNativeIosApp.mockReturnValue(true)
    expect(locationPermissionDeniedCopy()).toMatch(/Ajustes/)
    expect(locationPermissionDeniedCopy()).not.toMatch(/navegador/)
  })
})
