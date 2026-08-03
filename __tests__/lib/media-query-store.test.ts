/**
 * @jest-environment jsdom
 */
import {
  __resetMediaQueryStoresForTests,
  getMediaQueryStore,
  resolveMapVariant,
} from "@/lib/media-query-store"

describe("media-query-store", () => {
  afterEach(() => {
    __resetMediaQueryStoresForTests()
  })

  it("getServerSnapshot returns null (SSR indeterminate)", () => {
    const store = getMediaQueryStore("(max-width: 768px)")
    expect(store.getServerSnapshot()).toBeNull()
  })

  it("resolveMapVariant never mounts desktop+mobile together", () => {
    expect(resolveMapVariant(null)).toBe("loading")
    expect(resolveMapVariant(true)).toBe("mobile")
    expect(resolveMapVariant(false)).toBe("desktop")
  })

  it("subscribe/getSnapshot are stable for same query", () => {
    const a = getMediaQueryStore("(max-width: 768px)")
    const b = getMediaQueryStore("(max-width: 768px)")
    expect(a).toBe(b)
    expect(a.subscribe).toBe(b.subscribe)
    expect(a.getSnapshot).toBe(b.getSnapshot)
  })

  it("reflects mobile matchMedia snapshot", () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes("768px"),
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })) as unknown as typeof window.matchMedia

    const store = getMediaQueryStore("(max-width: 768px)")
    expect(store.getSnapshot()).toBe(true)
  })

  it("reflects desktop matchMedia snapshot", () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })) as unknown as typeof window.matchMedia

    const store = getMediaQueryStore("(max-width: 768px)")
    expect(store.getSnapshot()).toBe(false)
  })

  it("notifies listeners on change and cleans up", () => {
    let handler: (() => void) | undefined
    const removeEventListener = jest.fn()
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: (_ev: string, h: EventListenerOrEventListenerObject) => {
        handler = typeof h === "function" ? (h as () => void) : undefined
      },
      removeEventListener,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })) as unknown as typeof window.matchMedia

    const store = getMediaQueryStore("(max-width: 768px)")
    const listener = jest.fn()
    const unsubscribe = store.subscribe(listener)
    expect(handler).toBeTruthy()
    handler?.()
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    handler?.()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
