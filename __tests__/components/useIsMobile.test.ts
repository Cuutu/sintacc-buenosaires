/**
 * @jest-environment jsdom
 */
import { resolveMapVariant } from "@/lib/media-query-store"

describe("useIsMobile / map variant contract", () => {
  it("loading state means no MapDesktop and no MapMobile", () => {
    expect(resolveMapVariant(null)).toBe("loading")
  })

  it("mobile viewport selects only mobile", () => {
    expect(resolveMapVariant(true)).toBe("mobile")
  })

  it("desktop viewport selects only desktop", () => {
    expect(resolveMapVariant(false)).toBe("desktop")
  })
})
