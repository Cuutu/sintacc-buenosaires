/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { LIST_LINK_STATUS, LIST_VISIBILITY } from "@/lib/lists/constants"

const mockRequireAuth = jest.fn()
const mockCheckRateLimit = jest.fn()
const mockGetServerSession = jest.fn()

jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))
jest.mock("@/lib/middleware", () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))
jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))
jest.mock("@/lib/logger", () => ({
  logApiError: jest.fn(),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))
jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))
jest.mock("@/lib/auth", () => ({
  authOptions: {},
}))

jest.mock("@/models/List", () => {
  const staticFns = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndDelete: jest.fn(),
  }
  const ListCtor: any = jest.fn().mockImplementation((doc: any) => {
    const instance: any = {
      ...doc,
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn().mockImplementation(() => ({
        _id: "507f1f77bcf86cd799439011",
        ...doc,
        createdBy: { _id: doc.createdBy, name: "Owner", image: null },
        placeIds: [],
      })),
    }
    return instance
  })
  Object.assign(ListCtor, staticFns)
  return { List: ListCtor }
})

jest.mock("@/models/ListLike", () => ({
  ListLike: { deleteMany: jest.fn().mockResolvedValue({}) },
}))
jest.mock("@/models/Place", () => ({}))
jest.mock("@/models/User", () => ({}))

import { List } from "@/models/List"
import { GET as getLists, POST as createList } from "@/app/api/lists/route"
import {
  GET as getListById,
  PATCH as patchList,
} from "@/app/api/lists/[id]/route"
import { POST as privateLinkAction } from "@/app/api/lists/[id]/private-link/route"
import { GET as getPrivateByToken } from "@/app/api/lists/private/[token]/route"

const ListMock = List as unknown as {
  find: jest.Mock
  findById: jest.Mock
  findOne: jest.Mock
}

const ownerSession = {
  user: {
    id: "507f1f77bcf86cd799439099",
    email: "creator@example.com",
    role: "user",
    name: "Creator",
  },
}

const otherSession = {
  user: {
    id: "507f1f77bcf86cd799439088",
    email: "other@example.com",
    role: "user",
    name: "Other",
  },
}

function chainFind(result: unknown) {
  return {
    select: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(result),
  }
}

describe("API listas privadas", () => {
  const prevEnabled = process.env.PRIVATE_LISTS_ENABLED
  const prevAllow = process.env.PRIVATE_LISTS_ALLOWLIST

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.PRIVATE_LISTS_ENABLED = "true"
    process.env.PRIVATE_LISTS_ALLOWLIST = "creator@example.com"
    mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 5 })
  })

  afterEach(() => {
    process.env.PRIVATE_LISTS_ENABLED = prevEnabled
    process.env.PRIVATE_LISTS_ALLOWLIST = prevAllow
  })

  it("1. owner puede crear lista privada", async () => {
    mockRequireAuth.mockResolvedValue(ownerSession)

    const request = new NextRequest("http://localhost/api/lists", {
      method: "POST",
      body: JSON.stringify({
        name: "Para María Madrid",
        placeIds: ["507f1f77bcf86cd799439011"],
        placeNotes: [
          { placeId: "507f1f77bcf86cd799439011", note: "Pedí sin pan" },
        ],
        visibility: LIST_VISIBILITY.PRIVATE_LINK,
      }),
    })

    const res = await createList(request)
    const data = await res.json()
    expect(res.status).toBe(201)
    expect(data.visibility).toBe(LIST_VISIBILITY.PRIVATE_LINK)
    expect(data.isPublic).toBe(false)
    expect(data.privateSharePath).toMatch(/^\/listas\/privadas\//)
  })

  it("2. otro usuario no puede editar lista ajena", async () => {
    mockRequireAuth.mockResolvedValue(otherSession)

    ListMock.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        createdBy: { toString: () => ownerSession.user.id },
        visibility: LIST_VISIBILITY.PRIVATE_LINK,
      }),
    })

    const request = new NextRequest(
      "http://localhost/api/lists/507f1f77bcf86cd799439011",
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Hack" }),
      }
    )
    const res = await patchList(request, {
      params: { id: "507f1f77bcf86cd799439011" },
    })
    expect(res.status).toBe(403)
  })

  it("3. cliente con token válido ve lista sin sesión", async () => {
    const token = "a".repeat(43)
    ListMock.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        name: "Privada",
        visibility: LIST_VISIBILITY.PRIVATE_LINK,
        linkStatus: LIST_LINK_STATUS.ACTIVE,
        privateAccessToken: token,
        placeIds: [],
        placeNotes: [{ placeId: "p1", note: "Nota" }],
        createdBy: { name: "Creator" },
        isPublic: false,
      }),
    })

    const res = await getPrivateByToken(
      new NextRequest(`http://localhost/api/lists/private/${token}`),
      { params: { token } }
    )
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.name).toBe("Privada")
    expect(data.privateAccessToken).toBeUndefined()
    expect(res.headers.get("Cache-Control")).toContain("no-store")
  })

  it("4. sin token válido → 404", async () => {
    const res = await getPrivateByToken(
      new NextRequest("http://localhost/api/lists/private/short"),
      { params: { token: "short" } }
    )
    expect(res.status).toBe(404)
  })

  it("5. enlace revocado → 404", async () => {
    const token = "b".repeat(43)
    ListMock.findOne.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    })
    const res = await getPrivateByToken(
      new NextRequest(`http://localhost/api/lists/private/${token}`),
      { params: { token } }
    )
    expect(res.status).toBe(404)
  })

  it("6. regenerar invalida token anterior", async () => {
    mockRequireAuth.mockResolvedValue(ownerSession)

    const oldToken = "oldtokenoldtokenoldtokenoldtokenold12"
    const listDoc: Record<string, unknown> = {
      _id: "507f1f77bcf86cd799439011",
      createdBy: { toString: () => ownerSession.user.id },
      visibility: LIST_VISIBILITY.PRIVATE_LINK,
      privateAccessToken: oldToken,
      linkStatus: LIST_LINK_STATUS.ACTIVE,
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(undefined),
      toObject() {
        return {
          _id: listDoc._id,
          visibility: listDoc.visibility,
          privateAccessToken: listDoc.privateAccessToken,
          linkStatus: listDoc.linkStatus,
          isPublic: false,
          name: "Privada",
          placeIds: [],
          createdBy: { _id: ownerSession.user.id, name: "Creator" },
        }
      },
    }
    ListMock.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(listDoc),
    })

    const res = await privateLinkAction(
      new NextRequest(
        "http://localhost/api/lists/507f1f77bcf86cd799439011/private-link",
        {
          method: "POST",
          body: JSON.stringify({ action: "regenerate" }),
        }
      ),
      { params: { id: "507f1f77bcf86cd799439011" } }
    )
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(listDoc.privateAccessToken).not.toBe(oldToken)
    expect(data.privateSharePath).not.toContain(oldToken)
  })

  it("7. listas privadas no aparecen en GET público", async () => {
    ListMock.find.mockReturnValue(chainFind([]))
    const res = await getLists(new NextRequest("http://localhost/api/lists"))
    expect(res.status).toBe(200)
    expect(ListMock.find).toHaveBeenCalled()
    const query = ListMock.find.mock.calls[0][0]
    expect(query.isPublic).toBe(true)
  })

  it("8. GET por id de privada sin ser owner → 404", async () => {
    mockGetServerSession.mockResolvedValue(null)
    ListMock.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        name: "Secreta",
        visibility: LIST_VISIBILITY.PRIVATE_LINK,
        isPublic: false,
        createdBy: { _id: ownerSession.user.id },
      }),
    })

    const res = await getListById(
      new NextRequest("http://localhost/api/lists/507f1f77bcf86cd799439011"),
      { params: { id: "507f1f77bcf86cd799439011" } }
    )
    expect(res.status).toBe(404)
  })

  it("9. lista pública sigue accesible por id", async () => {
    mockGetServerSession.mockResolvedValue(null)
    ListMock.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        name: "Pública",
        visibility: LIST_VISIBILITY.PUBLIC,
        isPublic: true,
        createdBy: { _id: ownerSession.user.id, name: "Owner" },
        placeIds: [],
      }),
    })

    const res = await getListById(
      new NextRequest("http://localhost/api/lists/507f1f77bcf86cd799439011"),
      { params: { id: "507f1f77bcf86cd799439011" } }
    )
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.name).toBe("Pública")
    expect(data.isPublic).toBe(true)
  })

  it("10. owner puede editar notas y orden", async () => {
    mockRequireAuth.mockResolvedValue(ownerSession)

    const listDoc: Record<string, unknown> = {
      _id: "507f1f77bcf86cd799439011",
      createdBy: { toString: () => ownerSession.user.id },
      name: "Privada",
      visibility: LIST_VISIBILITY.PRIVATE_LINK,
      isPublic: false,
      placeIds: [] as unknown[],
      placeNotes: [] as unknown[],
      privateAccessToken: "t".repeat(43),
      linkStatus: LIST_LINK_STATUS.ACTIVE,
      save: jest.fn().mockResolvedValue(undefined),
      populate: jest.fn().mockResolvedValue(undefined),
      toObject() {
        return {
          _id: listDoc._id,
          name: listDoc.name,
          visibility: listDoc.visibility,
          isPublic: listDoc.isPublic,
          placeIds: listDoc.placeIds,
          placeNotes: listDoc.placeNotes,
          privateAccessToken: listDoc.privateAccessToken,
          linkStatus: listDoc.linkStatus,
          createdBy: { _id: ownerSession.user.id, name: "Creator" },
        }
      },
    }
    ListMock.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(listDoc),
    })

    const res = await patchList(
      new NextRequest("http://localhost/api/lists/507f1f77bcf86cd799439011", {
        method: "PATCH",
        body: JSON.stringify({
          placeIds: [
            "507f1f77bcf86cd799439012",
            "507f1f77bcf86cd799439013",
          ],
          placeNotes: [
            {
              placeId: "507f1f77bcf86cd799439012",
              note: "Primera nota",
            },
          ],
        }),
      }),
      { params: { id: "507f1f77bcf86cd799439011" } }
    )
    expect(res.status).toBe(200)
    expect(listDoc.placeIds as unknown[]).toHaveLength(2)
    expect((listDoc.placeNotes as Array<{ note: string }>)[0].note).toBe(
      "Primera nota"
    )
  })
})
