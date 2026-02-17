import { fetchApi, FetchApiError } from "@/lib/fetchApi"

describe("fetchApi", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("returns parsed JSON when res.ok", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ foo: "bar" }),
    })
    const result = await fetchApi("/test")
    expect(result).toEqual({ foo: "bar" })
  })

  it("throws FetchApiError when !res.ok with API error message", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ error: "Lugar no encontrado" }),
    })
    await expect(fetchApi("/test")).rejects.toThrow(FetchApiError)
    try {
      await fetchApi("/test")
    } catch (e: any) {
      expect(e.message).toBe("Lugar no encontrado")
      expect(e.status).toBe(404)
      expect(e.data).toEqual({ error: "Lugar no encontrado" })
    }
  })

  it("throws with status text when API has no error field", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.resolve({}),
    })
    try {
      await fetchApi("/test")
    } catch (e: any) {
      expect(e.message).toContain("500")
    }
  })

  it("throws FetchApiError on AbortError (timeout)", async () => {
    const abortError = new Error("aborted")
    abortError.name = "AbortError"
    ;(global.fetch as jest.Mock).mockRejectedValue(abortError)
    try {
      await fetchApi("/test", { timeout: 100 })
    } catch (e: any) {
      expect(e).toBeInstanceOf(FetchApiError)
      expect(e.status).toBe(408)
    }
  })
})
