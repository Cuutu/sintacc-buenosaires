/**
 * @jest-environment jsdom
 */
import {
  __resetClientErrorReporterForTests,
  reportClientError,
  sanitizeMessage,
  sanitizeStack,
  setClientErrorSink,
} from "@/lib/client-error-reporter"

describe("client-error-reporter", () => {
  beforeEach(() => {
    __resetClientErrorReporterForTests()
  })

  it("sanitizes email bearer token coords", () => {
    expect(sanitizeMessage("fail user@x.com Bearer abc.def pk.eyJtest")).toContain(
      "[email]"
    )
    expect(sanitizeMessage("Bearer abc.def")).toContain("[redacted]")
    expect(sanitizeMessage("at -34.6037")).toContain("[coord]")
    expect(sanitizeStack("Error\n at foo user@x.com") || "").toContain("[email]")
  })

  it("dedupes identical errors within window", () => {
    const sink = jest.fn()
    setClientErrorSink(sink)
    reportClientError(new Error("same"), "boundary")
    reportClientError(new Error("same"), "boundary")
    expect(sink).toHaveBeenCalledTimes(1)
  })

  it("does not throw if sink throws", () => {
    setClientErrorSink(() => {
      throw new Error("sink down")
    })
    expect(() => reportClientError(new Error("x"), "window.onerror")).not.toThrow()
  })

  it("includes route platform source timestamp", () => {
    const sink = jest.fn()
    setClientErrorSink(sink)
    reportClientError(new Error("boom"), "unhandledrejection")
    expect(sink).toHaveBeenCalled()
    const report = sink.mock.calls[0][0]
    expect(report.source).toBe("unhandledrejection")
    expect(report.ts).toBeGreaterThan(0)
    expect(report.platform).toBeDefined()
    expect(report.message).toBe("boom")
  })
})
