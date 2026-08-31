/**
 * @jest-environment jsdom
 */
import { claimStoreBannerShownSession, STORE_BANNER_SHOWN_SESSION_KEY } from "@/lib/bottom-prompt"

describe("claimStoreBannerShownSession", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("primera vez true, segunda false en la misma session", () => {
    expect(claimStoreBannerShownSession()).toBe(true)
    expect(sessionStorage.getItem(STORE_BANNER_SHOWN_SESSION_KEY)).toBe("1")
    expect(claimStoreBannerShownSession()).toBe(false)
  })
})
