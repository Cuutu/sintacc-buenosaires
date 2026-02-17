/**
 * Tests para auth callbacks. Verifican que el flujo JWT evita hits a DB en session
 * cuando el token ya tiene id y role.
 */
import { authOptions } from "@/lib/auth"

jest.mock("@/lib/mongodb")
jest.mock("@/models/User")

describe("auth callbacks", () => {
  const mockUserFindOne = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    require("@/models/User").User.findOne = mockUserFindOne
  })

  describe("jwt callback", () => {
    it("returns token as-is when id already present (no DB hit)", async () => {
      const token = { id: "user123", role: "admin", email: "test@test.com" }
      const result = await (authOptions.callbacks as any).jwt({
        token,
        user: undefined,
      })
      expect(result).toEqual(token)
      expect(mockUserFindOne).not.toHaveBeenCalled()
    })

    it("fetches user and adds id/role when providerUser present and no token.id", async () => {
      mockUserFindOne.mockResolvedValue({
        _id: { toString: () => "user456" },
        role: "user",
      })
      const token = {}
      const providerUser = { email: "new@test.com", name: "New User" }
      const result = await (authOptions.callbacks as any).jwt({
        token,
        user: providerUser,
      })
      expect(mockUserFindOne).toHaveBeenCalledWith({ email: "new@test.com" })
      expect(result.id).toBe("user456")
      expect(result.role).toBe("user")
    })
  })

  describe("session callback", () => {
    it("populates session from token without DB hit", async () => {
      const session = { user: { email: "test@test.com" } }
      const token = { id: "user789", role: "admin" }
      const result = await (authOptions.callbacks as any).session({
        session,
        token,
      })
      expect(result.user.id).toBe("user789")
      expect(result.user.role).toBe("admin")
      expect(mockUserFindOne).not.toHaveBeenCalled()
    })
  })
})
