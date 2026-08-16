/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from "next/server"

jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/logger", () => ({
  logApiError: jest.fn(),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

jest.mock("@/lib/api-cache", () => ({
  getOrSetApiCache: (_key: string, _ttl: number, loader: () => Promise<unknown>) =>
    loader(),
  invalidateApiCache: jest.fn(),
}))

jest.mock("@/lib/admin-ops", () => ({
  getAdminCounts: jest.fn().mockResolvedValue({}),
  getAdminOpsSnapshot: jest.fn().mockResolvedValue({ inbox: [], activity: [] }),
}))

jest.mock("@/models/Place", () => {
  const q = () => {
    const api: Record<string, unknown> = {}
    api.sort = jest.fn(() => api)
    api.skip = jest.fn(() => api)
    api.limit = jest.fn(() => api)
    api.select = jest.fn(() => api)
    api.populate = jest.fn(() => api)
    api.lean = jest.fn().mockResolvedValue([])
    api.distinct = jest.fn().mockResolvedValue([])
    return api
  }
  return {
    Place: {
      find: jest.fn(() => q()),
      countDocuments: jest.fn().mockResolvedValue(0),
    },
  }
})

jest.mock("@/models/Review", () => {
  const q = () => {
    const api: Record<string, unknown> = {}
    api.sort = jest.fn(() => api)
    api.skip = jest.fn(() => api)
    api.limit = jest.fn(() => api)
    api.select = jest.fn(() => api)
    api.populate = jest.fn(() => api)
    api.lean = jest.fn().mockResolvedValue([])
    return api
  }
  return {
    Review: {
      find: jest.fn(() => q()),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue([]),
    },
  }
})

jest.mock("@/models/Contact", () => {
  const q = () => {
    const api: Record<string, unknown> = {}
    api.populate = jest.fn(() => api)
    api.sort = jest.fn(() => api)
    api.lean = jest.fn().mockResolvedValue([])
    api.select = jest.fn(() => api)
    api.limit = jest.fn(() => api)
    return api
  }
  return { Contact: { find: jest.fn(() => q()) } }
})

jest.mock("@/models/Venture", () => {
  const q = () => {
    const api: Record<string, unknown> = {}
    api.select = jest.fn(() => api)
    api.limit = jest.fn(() => api)
    api.lean = jest.fn().mockResolvedValue([])
    return api
  }
  return { Venture: { find: jest.fn(() => q()) } }
})

jest.mock("@/models/Suggestion", () => {
  const q = () => {
    const api: Record<string, unknown> = {}
    api.select = jest.fn(() => api)
    api.limit = jest.fn(() => api)
    api.lean = jest.fn().mockResolvedValue([])
    return api
  }
  return { Suggestion: { find: jest.fn(() => q()) } }
})

jest.mock("@/models/User", () => {
  const q = () => {
    const api: Record<string, unknown> = {}
    api.select = jest.fn(() => api)
    api.limit = jest.fn(() => api)
    api.lean = jest.fn().mockResolvedValue([])
    return api
  }
  return { User: { find: jest.fn(() => q()), exists: jest.fn() } }
})

const mockRequireAdmin = jest.fn()
jest.mock("@/lib/middleware", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

function getReq(path: string) {
  return new NextRequest(`http://localhost:3000${path}`)
}

const DENIED = NextResponse.json({ error: "No autorizado" }, { status: 401 })
const ADMIN_SESSION = {
  user: { id: "507f1f77bcf86cd799439011", email: "a@x.com", role: "admin" },
}

describe("GET /api/admin/* protection", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const cases: Array<{
    name: string
    path: string
    load: () => Promise<{ GET: (req: NextRequest) => Promise<Response> }>
  }> = [
    {
      name: "contacts",
      path: "/api/admin/contacts",
      load: () => import("@/app/api/admin/contacts/route"),
    },
    {
      name: "ops",
      path: "/api/admin/ops",
      load: () => import("@/app/api/admin/ops/route"),
    },
    {
      name: "places",
      path: "/api/admin/places",
      load: () => import("@/app/api/admin/places/route"),
    },
    {
      name: "reviews",
      path: "/api/admin/reviews",
      load: () => import("@/app/api/admin/reviews/route"),
    },
    {
      name: "search",
      path: "/api/admin/search?q=ab",
      load: () => import("@/app/api/admin/search/route"),
    },
    {
      name: "counts",
      path: "/api/admin/counts",
      load: () => import("@/app/api/admin/counts/route"),
    },
  ]

  it.each(cases)("GET $name sin auth → denied", async ({ path, load }) => {
    mockRequireAdmin.mockResolvedValue(DENIED)
    const { GET } = await load()
    const res = await GET(getReq(path))
    expect(res.status).toBe(401)
  })

  it.each(cases)("GET $name con admin → allowed", async ({ path, load }) => {
    mockRequireAdmin.mockResolvedValue(ADMIN_SESSION)
    const { GET } = await load()
    const res = await GET(getReq(path))
    expect(res.status).toBe(200)
  })
})
