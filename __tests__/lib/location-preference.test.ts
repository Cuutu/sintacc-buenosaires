/**
 * @jest-environment jsdom
 */
import {
  clearLocationAutoEnabled,
  getLocationAutoEnabled,
  setLocationAutoEnabled,
} from "@/lib/location-preference"

const KEY = "celimap_location_auto_enabled"

describe("location preference", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("default false", () => {
    expect(getLocationAutoEnabled()).toBe(false)
  })

  it("set true y get true", () => {
    setLocationAutoEnabled(true)
    expect(localStorage.getItem(KEY)).toBe("1")
    expect(getLocationAutoEnabled()).toBe(true)
  })

  it("clear vuelve a false", () => {
    setLocationAutoEnabled(true)
    clearLocationAutoEnabled()
    expect(getLocationAutoEnabled()).toBe(false)
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it("storage corrupto trata como false", () => {
    localStorage.setItem(KEY, "not-a-flag")
    expect(getLocationAutoEnabled()).toBe(false)
  })

  it("storage unavailable no rompe", () => {
    const getItem = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(getLocationAutoEnabled()).toBe(false)
    getItem.mockRestore()
  })

  it("set unavailable no rompe", () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(() => setLocationAutoEnabled(true)).not.toThrow()
    expect(getLocationAutoEnabled()).toBe(false)
    setItem.mockRestore()
  })
})
