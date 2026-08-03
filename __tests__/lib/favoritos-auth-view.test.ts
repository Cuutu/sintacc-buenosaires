import { resolveFavoritosAuthView } from "@/lib/favoritos-auth-view"

describe("resolveFavoritosAuthView", () => {
  it("loading shows loading (no redirect implied)", () => {
    expect(
      resolveFavoritosAuthView({ status: "loading", hasSessionUser: false })
    ).toEqual({ kind: "loading" })
  })

  it("authenticated with user is ready", () => {
    expect(
      resolveFavoritosAuthView({ status: "authenticated", hasSessionUser: true })
    ).toEqual({ kind: "ready" })
  })

  it("unauthenticated is unauthenticated", () => {
    expect(
      resolveFavoritosAuthView({
        status: "unauthenticated",
        hasSessionUser: false,
      })
    ).toEqual({ kind: "unauthenticated" })
  })

  it("authenticated without user is session_error", () => {
    const view = resolveFavoritosAuthView({
      status: "authenticated",
      hasSessionUser: false,
    })
    expect(view.kind).toBe("session_error")
  })

  it("explicit sessionError wins", () => {
    expect(
      resolveFavoritosAuthView({
        status: "authenticated",
        hasSessionUser: true,
        sessionError: "boom",
      })
    ).toEqual({ kind: "session_error", message: "boom" })
  })

  it("never returns empty/black kind", () => {
    const kinds = ["loading", "unauthenticated", "ready", "session_error"]
    for (const status of ["loading", "authenticated", "unauthenticated"] as const) {
      const view = resolveFavoritosAuthView({
        status,
        hasSessionUser: status === "authenticated",
      })
      expect(kinds).toContain(view.kind)
    }
  })
})
