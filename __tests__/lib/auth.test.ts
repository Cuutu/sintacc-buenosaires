/**
 * Tests para auth callbacks. Verifican refresh de rol desde DB en cada jwt.
 * @jest-environment node
 */
jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/models/User")

import { authOptions } from "@/lib/auth"

describe("auth callbacks", () => {
  const mockUserFindOne = jest.fn()
  const mockUserFindById = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    require("@/models/User").User.findOne = mockUserFindOne
    require("@/models/User").User.findById = mockUserFindById
  })

  describe("jwt callback", () => {
    it("re-fetches role from DB when token already has id", async () => {
      mockUserFindById.mockResolvedValue({
        _id: { toString: () => "user123" },
        role: "user",
        email: "test@test.com",
      })
      const token = { id: "user123", role: "admin", email: "test@test.com" }
      const result = await (authOptions.callbacks as any).jwt({
        token,
        user: undefined,
      })
      expect(mockUserFindById).toHaveBeenCalledWith("user123")
      expect(result.role).toBe("user")
    })

    it("fetches user and adds id/role when providerUser present", async () => {
      mockUserFindOne.mockResolvedValue({
        _id: { toString: () => "user456" },
        role: "user",
        email: "new@test.com",
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
