/**
 * @jest-environment jsdom
 */
import {
  claimStoreBannerShownSession,
  isStoreBannerUnlocked,
  STORE_BANNER_SHOWN_SESSION_KEY,
  STORE_BANNER_UNLOCK_KEY,
  unlockStoreBanner,
} from "@/lib/bottom-prompt"

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

describe("unlockStoreBanner", () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it("arranca locked y queda unlocked en la session", () => {
    expect(isStoreBannerUnlocked()).toBe(false)
    unlockStoreBanner()
    expect(sessionStorage.getItem(STORE_BANNER_UNLOCK_KEY)).toBe("1")
    expect(isStoreBannerUnlocked()).toBe(true)
  })
})
