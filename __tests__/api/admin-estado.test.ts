/** @jest-environment node */
import { NextRequest, NextResponse } from "next/server"
import { PATCH as contactPatch } from "@/app/api/admin/contacts/[id]/route"
import { PATCH as reviewPatch } from "@/app/api/admin/reviews/[id]/route"
import { PATCH as ventureReviewPatch } from "@/app/api/admin/venture-reviews/[id]/route"
import { GET as reviewsGet } from "@/app/api/admin/reviews/route"
import { requireAdmin } from "@/lib/middleware"
import { Contact } from "@/models/Contact"
import { Review } from "@/models/Review"
import { VentureReview } from "@/models/VentureReview"

jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/lib/middleware", () => ({ requireAdmin: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logApiError: jest.fn() }))
jest.mock("@/lib/api-cache", () => ({ invalidateApiCache: jest.fn() }))
jest.mock("@/models/Contact", () => ({ Contact: { findByIdAndUpdate: jest.fn() } }))
jest.mock("@/models/Review", () => ({ Review: { findByIdAndUpdate: jest.fn(), find: jest.fn(), countDocuments: jest.fn() } }))
jest.mock("@/models/VentureReview", () => ({ VentureReview: { findByIdAndUpdate: jest.fn() } }))
jest.mock("@/models/Place", () => ({ Place: { find: jest.fn() } }))

const id = "507f1f77bcf86cd799439011"
const request = (body: unknown) => new NextRequest("http://localhost/api/admin/test", { method: "PATCH", body: JSON.stringify(body) })

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(requireAdmin).mockResolvedValue({ user: { role: "admin" } } as never)
})

describe.each([
  ["contact", contactPatch, Contact],
  ["review", reviewPatch, Review],
  ["venture review", ventureReviewPatch, VentureReview],
] as const)("%s estado", (_name, patch, model) => {
  it.each(["pendiente", "respondido", "archivado"])("actualiza %s sin modificar status", async estado => {
    jest.mocked(model.findByIdAndUpdate).mockResolvedValue({ estado } as never)
    const response = await patch(request({ estado }), { params: { id } })
    expect(response.status).toBe(200)
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(id, { $set: { estado } }, { new: true, runValidators: true })
  })
  it("rechaza estados inválidos sin escribir", async () => {
    expect((await patch(request({ estado: "read" }), { params: { id } })).status).toBe(400)
    expect(model.findByIdAndUpdate).not.toHaveBeenCalled()
  })
  it("exige permisos de administrador", async () => {
    jest.mocked(requireAdmin).mockResolvedValue(NextResponse.json({}, { status: 403 }))
    expect((await patch(request({ estado: "archivado" }), { params: { id } })).status).toBe(403)
    expect(model.findByIdAndUpdate).not.toHaveBeenCalled()
  })
  it("no reporta éxito para documentos inexistentes", async () => {
    jest.mocked(model.findByIdAndUpdate).mockResolvedValue(null)
    expect((await patch(request({ estado: "respondido" }), { params: { id } })).status).toBe(404)
  })
})

it("publicar respuesta actualiza estado en la misma operación", async () => {
  jest.mocked(Review.findByIdAndUpdate).mockResolvedValue({ estado: "respondido" } as never)
  expect((await reviewPatch(request({ action: "reply", reply: "Gracias por compartir tu experiencia." }), { params: { id } })).status).toBe(200)
  expect(Review.findByIdAndUpdate).toHaveBeenCalledWith(id, expect.objectContaining({ estado: "respondido", adminReply: expect.any(String) }), { new: true })
})

it("ocultar una reseña conserva su estado de gestión", async () => {
  jest.mocked(Review.findByIdAndUpdate).mockResolvedValue({ status: "hidden" } as never)
  await reviewPatch(request({ action: "hide" }), { params: { id } })
  expect(Review.findByIdAndUpdate).toHaveBeenCalledWith(id, { status: "hidden" }, { new: true })
})

it("combina estado con visibilidad y búsqueda antes de paginar", async () => {
  const chain = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) }
  jest.mocked(Review.find).mockReturnValue(chain as never)
  jest.mocked(Review.countDocuments).mockResolvedValue(0)
  const response = await reviewsGet(new NextRequest("http://localhost/api/admin/reviews?estado=pendiente&status=hidden"))
  expect(response.status).toBe(200)
  expect(Review.find).toHaveBeenCalledWith({ status: "hidden", $and: [{ $or: [{ estado: "pendiente" }, { estado: { $exists: false } }] }] })
})
