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
import { parseClientErrorBody } from "@/lib/client-error-schema"
import {
  __resetNavTelemetryForTests,
  recordBottomNavIntent,
  setAuthStatusProbe,
} from "@/lib/nav-telemetry"

describe("client-error-reporter observability", () => {
  beforeEach(() => {
    __resetClientErrorReporterForTests()
    __resetNavTelemetryForTests()
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ eventId: "TEST01" }) }) as unknown as typeof fetch
  })

  it("sanitizes email bearer token cookie coords sensitive query", () => {
    expect(sanitizeMessage("fail user@x.com Bearer abc.def pk.eyJtest")).toContain("[email]")
    expect(sanitizeMessage("Bearer abc.def")).toContain("[redacted]")
    expect(sanitizeMessage("Cookie: secret=1")).toContain("[redacted]")
    expect(sanitizeMessage("at -34.6037")).toContain("[coord]")
    expect(sanitizeMessage("/x?access_token=abc&ok=1")).not.toContain("abc")
    expect(sanitizeStack("Error\n at foo user@x.com") || "").toContain("[email]")
  })

  it("dedupes identical errors for at least 10s", () => {
    const sink = jest.fn()
    setClientErrorSink(sink)
    const a = reportClientError({ source: "page-boundary", error: new Error("same") })
    const b = reportClientError({ source: "page-boundary", error: new Error("same") })
    expect(a).toBeTruthy()
    expect(b).toBeNull()
    expect(sink).toHaveBeenCalledTimes(1)
  })

  it("does not throw if sink throws; posts still attempted", () => {
    setClientErrorSink(() => {
      throw new Error("sink down")
    })
    expect(() =>
      reportClientError({ source: "window-error", error: new Error("x") })
    ).not.toThrow()
    expect(global.fetch).toHaveBeenCalled()
  })

  it("includes navigation auth build source eventId without PII", () => {
    const sink = jest.fn()
    setClientErrorSink(sink)
    setAuthStatusProbe("authenticated")
    recordBottomNavIntent("/favoritos", "/perfil", "perfil")
    reportClientError({
      source: "page-boundary",
      error: new Error("boom user@evil.com"),
      componentStack: "in Foo\nuser@x.com",
    })
    const report = sink.mock.calls[0][0]
    expect(report.source).toBe("page-boundary")
    expect(report.eventId).toMatch(/^[A-Z0-9]{6}$/)
    expect(report.authStatus).toBe("authenticated")
    expect(report.navigation?.slot).toBe("perfil")
    expect(report.navigation?.from).toBe("/favoritos")
    expect(report.message).not.toContain("@")
    expect(JSON.stringify(report)).not.toMatch(/evil\.com/)
    expect(report).not.toHaveProperty("email")
    expect(report).not.toHaveProperty("cookie")
  })

  it("schema strips unexpected fields and sensitive paths", () => {
    const parsed = parseClientErrorBody({
      source: "unhandled-rejection",
      message: "fail",
      email: "a@b.com",
      cookie: "x",
      token: "y",
      route: "/mapa?access_token=secret",
      stack: "x".repeat(20_000),
      eventId: "AB12CD",
    })
    expect("error" in parsed).toBe(false)
    if ("error" in parsed) return
    expect(parsed.route).toBe("/mapa")
    expect((parsed as { email?: string }).email).toBeUndefined()
    expect(parsed.stack!.length).toBeLessThan(4000)
  })
})
