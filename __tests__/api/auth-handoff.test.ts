/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/lib/auth", () => ({ authOptions: { secret: "test-secret", session: { maxAge: 60 } } }))
jest.mock("next-auth/jwt", () => ({ encode: jest.fn(async () => "jwt-token") }))

const mockHandoffFindOne = jest.fn()
jest.mock("@/models/MobileAuthHandoff", () => ({
  MobileAuthHandoff: { findOne: (...a: unknown[]) => mockHandoffFindOne(...a) },
}))
const mockUserFindById = jest.fn()
jest.mock("@/models/User", () => ({
  User: { findById: (...a: unknown[]) => mockUserFindById(...a) },
}))

import { GET } from "@/app/api/auth/handoff/route"

// Así llega request.url en el servidor propio: Next la arma con su puerto local, no con el dominio.
const req = (query: string) => new NextRequest(`https://localhost:3000/api/auth/handoff${query}`)

describe("GET /api/auth/handoff", () => {
  beforeEach(() => {
    mockHandoffFindOne.mockReset()
    mockUserFindById.mockReset()
  })

  it("después de iniciar sesión vuelve a la página pedida en el mismo sitio, no a localhost", async () => {
    const save = jest.fn()
    mockHandoffFindOne.mockResolvedValue({ userId: "u1", nextPath: "/perfil", used: false, save })
    mockUserFindById.mockResolvedValue({
      _id: { toString: () => "u1" },
      email: "a@b.com",
      name: "A",
      image: null,
      role: "user",
    })

    const res = await GET(req("?code=abc&next=%2Fperfil"))

    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toBe("/perfil")
    expect(res.headers.get("location")).not.toContain("localhost")
    expect(res.headers.get("set-cookie")).toContain("jwt-token")
    expect(save).toHaveBeenCalled()
  })

  it("los errores también mandan a /login del mismo sitio", async () => {
    expect((await GET(req(""))).headers.get("location")).toBe("/login")

    mockHandoffFindOne.mockResolvedValue(null)
    expect((await GET(req("?code=viejo"))).headers.get("location")).toBe("/login?error=handoff")
  })

  it("un next de otro sitio cae en /perfil", async () => {
    mockHandoffFindOne.mockResolvedValue({ userId: "u1", nextPath: "/perfil", used: false, save: jest.fn() })
    mockUserFindById.mockResolvedValue({ _id: { toString: () => "u1" }, email: "a@b.com", role: "user" })

    const res = await GET(req("?code=abc&next=https%3A%2F%2Fevil.com"))
    expect(res.headers.get("location")).toBe("/perfil")
  })
})
