/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from "next/server"

const mockRequireAuth = jest.fn()
jest.mock("@/lib/middleware", () => ({ requireAuth: (...a: unknown[]) => mockRequireAuth(...a) }))
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
const mockUpdateOne = jest.fn()
jest.mock("@/models/LoyaltyProgram", () => ({
  LoyaltyProgram: { updateOne: (...a: unknown[]) => mockUpdateOne(...a) },
}))
const mockGetData = jest.fn()
jest.mock("@/lib/wallet/loyalty", () => ({
  ...jest.requireActual("@/lib/wallet/loyalty"),
  getProgramWithPlace: (...a: unknown[]) => mockGetData(...a),
}))

import { PUT } from "@/app/api/local/programas/[programaId]/equipo/route"

const ID = "507f1f77bcf86cd799439012"
const put = (body: unknown) =>
  PUT(new NextRequest(`http://localhost:3000/api/local/programas/${ID}/equipo`, { method: "PUT", body: JSON.stringify(body) }), {
    params: { programaId: ID },
  })
const manager = { user: { id: "u", email: "duenio@local.com", role: "user" } }

describe("PUT /api/local/programas/[id]/equipo", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireAuth.mockResolvedValue(manager)
    mockGetData.mockResolvedValue({
      program: {
        _id: ID,
        staffEmails: ["duenio@local.com"],
        employeeEmails: [],
        branches: [{ placeId: { toString: () => "suc1" }, staffEmails: [] }],
      },
    })
  })

  it("lets the manager add an employee (lowercase)", async () => {
    expect((await put({ employeeEmails: ["Caja@Gmail.com"] })).status).toBe(200)
    expect(mockUpdateOne).toHaveBeenCalledWith({ _id: ID }, { $set: { employeeEmails: ["caja@gmail.com"] } }, expect.anything())
  })

  it("updates only who works at a branch", async () => {
    await put({ branches: [{ placeId: "suc1", staffEmails: ["mozo@gmail.com"] }] })
    expect(mockUpdateOne).toHaveBeenCalledWith({ _id: ID }, { $set: { "branches.0.staffEmails": ["mozo@gmail.com"] } }, expect.anything())
    expect((await put({ branches: [{ placeId: "otra", staffEmails: [] }] })).status).toBe(409)
  })

  it("only managers and admins; a manager can't remove themselves", async () => {
    mockRequireAuth.mockResolvedValue({ user: { id: "e", email: "caja@local.com", role: "user" } })
    expect((await put({ employeeEmails: ["x@gmail.com"] })).status).toBe(403)
    mockRequireAuth.mockResolvedValue(manager)
    expect((await put({ staffEmails: ["otro@gmail.com"] })).status).toBe(400)
    mockRequireAuth.mockResolvedValue(NextResponse.json({}, { status: 401 }))
    expect((await put({ employeeEmails: [] })).status).toBe(401)
    expect(mockUpdateOne).not.toHaveBeenCalled()
  })
})
