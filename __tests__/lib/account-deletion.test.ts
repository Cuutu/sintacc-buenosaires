/**
 * @jest-environment node
 */
import { Types } from "mongoose"
import { parseCloudinaryPublicIdFromUrl } from "@/lib/cloudinary/public-id-from-url"
import {
  ACCOUNT_DELETE_CONFIRM,
  AccountDeletionError,
  deleteAuthenticatedAccount,
} from "@/lib/account-deletion"
import { exchangeAndRevokeAppleAuthorization } from "@/lib/apple-token-revoke"

jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

type Doc = Record<string, unknown>

const g = globalThis as typeof globalThis & {
  __accountDeletionStore?: {
    users: Map<string, Doc>
    favorites: Doc[]
    lists: Doc[]
    listLikes: Doc[]
    reviews: Doc[]
    ventureReviews: Doc[]
    contaminationReports: Doc[]
    suggestions: Doc[]
    ventureSuggestions: Doc[]
    contacts: Doc[]
    pushTokens: Doc[]
    rateLimits: Doc[]
    googleGrants: Doc[]
    appleGrants: Doc[]
    handoffs: Doc[]
    jobs: Doc[]
    destroyed: string[]
  }
}

function store() {
  if (!g.__accountDeletionStore) {
    g.__accountDeletionStore = {
      users: new Map(),
      favorites: [],
      lists: [],
      listLikes: [],
      reviews: [],
      ventureReviews: [],
      contaminationReports: [],
      suggestions: [],
      ventureSuggestions: [],
      contacts: [],
      pushTokens: [],
      rateLimits: [],
      googleGrants: [],
      appleGrants: [],
      handoffs: [],
      jobs: [],
      destroyed: [],
    }
  }
  return g.__accountDeletionStore
}

function idStr(v: unknown): string {
  if (v && typeof v === "object" && "toString" in v) {
    return String((v as { toString(): string }).toString())
  }
  return String(v)
}

function filterMatchesUser(doc: Doc, filter: Doc, field: string): boolean {
  if (!(field in filter)) return true
  return idStr(doc[field]) === idStr(filter[field])
}

function deleteManyByField(arrName: keyof NonNullable<typeof g.__accountDeletionStore>, field: string) {
  return jest.fn(async (filter: Doc) => {
    const arr = store()[arrName] as Doc[]
    if (!Array.isArray(arr)) return { deletedCount: 0 }
    const before = arr.length
    const next = arr.filter((d) => !filterMatchesUser(d, filter, field))
    arr.length = 0
    arr.push(...next)
    return { deletedCount: before - next.length }
  })
}

jest.mock("@/models/User", () => ({
  User: {
    findById: jest.fn((id: { toString(): string }) => ({
      lean: async () => store().users.get(idStr(id)) ?? null,
    })),
    deleteOne: jest.fn(async (filter: { _id: { toString(): string } }) => {
      const id = idStr(filter._id)
      const had = store().users.has(id)
      store().users.delete(id)
      return { deletedCount: had ? 1 : 0 }
    }),
  },
}))

jest.mock("@/models/Favorite", () => ({
  Favorite: { deleteMany: (...a: unknown[]) => deleteManyByField("favorites", "userId")(...(a as [Doc])) },
}))
jest.mock("@/models/List", () => ({
  List: {
    find: jest.fn((filter: Doc) => ({
      select: () => ({
        lean: () => ({
          session: async () =>
            store().lists.filter((l) => filterMatchesUser(l, filter, "createdBy")),
        }),
      }),
    })),
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("lists", "createdBy")(...(a as [Doc])),
    updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
  },
}))
jest.mock("@/models/ListLike", () => ({
  ListLike: {
    find: jest.fn((filter: Doc) => ({
      select: () => ({
        lean: () => ({
          session: async () =>
            store().listLikes.filter((l) => filterMatchesUser(l, filter, "userId")),
        }),
      }),
    })),
    deleteMany: jest.fn(async (filter: Doc) => {
      const arr = store().listLikes
      const before = arr.length
      if (filter.userId) {
        const next = arr.filter((l) => !filterMatchesUser(l, filter, "userId"))
        arr.length = 0
        arr.push(...next)
      } else {
        arr.length = 0
      }
      return { deletedCount: before - arr.length }
    }),
  },
}))
jest.mock("@/models/Review", () => ({
  Review: {
    find: jest.fn((filter: Doc) => ({
      select: () => ({
        lean: () => ({
          session: async () =>
            store().reviews.filter((r) => filterMatchesUser(r, filter, "userId")),
        }),
      }),
    })),
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("reviews", "userId")(...(a as [Doc])),
  },
}))
jest.mock("@/models/VentureReview", () => ({
  VentureReview: {
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("ventureReviews", "userId")(...(a as [Doc])),
  },
}))
jest.mock("@/models/ContaminationReport", () => ({
  ContaminationReport: {
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("contaminationReports", "userId")(...(a as [Doc])),
  },
}))
jest.mock("@/models/Suggestion", () => ({
  Suggestion: {
    find: jest.fn(() => ({
      select: () => ({
        lean: () => ({
          session: async () => store().suggestions,
        }),
      }),
    })),
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("suggestions", "suggestedByUserId")(...(a as [Doc])),
    updateMany: jest.fn(async () => ({ modifiedCount: 0 })),
  },
}))
jest.mock("@/models/VentureSuggestion", () => ({
  VentureSuggestion: {
    find: jest.fn(() => ({
      select: () => ({
        lean: () => ({
          session: async () => store().ventureSuggestions,
        }),
      }),
    })),
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("ventureSuggestions", "suggestedByUserId")(
        ...(a as [Doc])
      ),
    updateMany: jest.fn(async () => ({ modifiedCount: 0 })),
  },
}))
jest.mock("@/models/Contact", () => ({
  Contact: {
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("contacts", "userId")(...(a as [Doc])),
  },
}))
jest.mock("@/models/PushToken", () => ({
  PushToken: {
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("pushTokens", "userId")(...(a as [Doc])),
  },
}))
jest.mock("@/models/RateLimit", () => ({
  RateLimit: {
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("rateLimits", "userId")(...(a as [Doc])),
  },
}))
jest.mock("@/models/NativeGoogleGrant", () => ({
  NativeGoogleGrant: {
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("googleGrants", "userId")(...(a as [Doc])),
  },
}))
jest.mock("@/models/NativeAppleGrant", () => ({
  NativeAppleGrant: {
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("appleGrants", "userId")(...(a as [Doc])),
  },
}))
jest.mock("@/models/MobileAuthHandoff", () => ({
  MobileAuthHandoff: {
    deleteMany: (...a: unknown[]) =>
      deleteManyByField("handoffs", "userId")(...(a as [Doc])),
  },
}))

jest.mock("@/models/AccountDeletionJob", () => ({
  AccountDeletionJob: {
    findOne: jest.fn((filter: Doc) => ({
      lean: async () => {
        const uid = idStr(filter.userId)
        const jobs = store().jobs.filter((j) => idStr(j.userId) === uid)
        if (!jobs.length) return null
        const statusFilter = filter.status as
          | string
          | { $in?: string[] }
          | undefined
        if (!statusFilter) return jobs[0]
        if (typeof statusFilter === "string") {
          return jobs.find((j) => j.status === statusFilter) ?? null
        }
        if (statusFilter.$in) {
          return (
            jobs.find((j) =>
              statusFilter.$in!.includes(String(j.status))
            ) ?? null
          )
        }
        return jobs[0]
      },
    })),
    create: jest.fn(async (data: Doc) => {
      const uid = idStr(data.userId)
      if (store().jobs.some((j) => idStr(j.userId) === uid)) {
        const err = new Error("duplicate") as Error & { code: number }
        err.code = 11000
        throw err
      }
      store().jobs.push({ ...data, userId: uid })
      return data
    }),
    updateOne: jest.fn(async (filter: Doc, update: { $set: Doc }) => {
      const job = store().jobs.find(
        (j) => idStr(j.userId) === idStr(filter.userId)
      )
      if (job) Object.assign(job, update.$set)
      return { modifiedCount: job ? 1 : 0 }
    }),
    deleteOne: jest.fn(async (filter: Doc) => {
      const before = store().jobs.length
      const next = store().jobs.filter(
        (j) => idStr(j.userId) !== idStr(filter.userId)
      )
      store().jobs.length = 0
      store().jobs.push(...next)
      return { deletedCount: before - next.length }
    }),
  },
}))

jest.mock("@/lib/cloudinary/destroy-assets", () => ({
  destroyCloudinaryPublicIds: jest.fn(async (ids: string[]) => {
    store().destroyed.push(...ids)
    return { destroyed: ids, failed: [], skipped: [] }
  }),
  destroyCloudinaryUrls: jest.fn(async (urls: string[]) => {
    store().destroyed.push(...urls)
    return {
      destroyed: urls,
      failed: [],
      skipped: [],
      pendingPublicIds: [],
      unparseableUrls: 0,
    }
  }),
}))

jest.mock("@/lib/native-apple-auth", () => ({
  AppleAuthError: class AppleAuthError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.code = code
    }
  },
  appleRequestNonceFromRaw: jest.fn((raw: string) => `hash:${raw}`),
  consumeNativeAppleChallenge: jest.fn(async () => ({ nonceRaw: "raw-nonce" })),
  verifyAppleIdToken: jest.fn(async () => ({
    sub: "apple-sub-1",
    emailVerified: true,
  })),
}))

jest.mock("mongoose", () => {
  const actual = jest.requireActual("mongoose")
  return {
    ...actual,
    connection: {
      readyState: 0,
      startSession: undefined,
    },
  }
})

const userId = "507f1f77bcf86cd799439011"
const otherUserId = "507f1f77bcf86cd799439022"

describe("parseCloudinaryPublicIdFromUrl", () => {
  it("parses folder/public id from secure_url", () => {
    const r = parseCloudinaryPublicIdFromUrl(
      "https://res.cloudinary.com/demo/image/upload/v123/celimap/abc123.jpg",
      "demo"
    )
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.publicId).toBe("celimap/abc123")
  })

  it("rejects wrong cloud / host", () => {
    expect(
      parseCloudinaryPublicIdFromUrl(
        "https://res.cloudinary.com/other/image/upload/celimap/x.png",
        "demo"
      ).ok
    ).toBe(false)
  })
})

describe("extractAppleAuthorizationCode", () => {
  it("legacy Capgo: accessToken.token", () => {
    const { extractAppleAuthorizationCodeString } = require("@/lib/apple-authorization-code")
    expect(
      extractAppleAuthorizationCodeString({
        accessToken: { token: "legacy-code" },
      })
    ).toBe("legacy-code")
  })
})

describe("deleteAuthenticatedAccount", () => {
  beforeEach(() => {
    const s = store()
    s.users.clear()
    for (const key of [
      "favorites",
      "lists",
      "listLikes",
      "reviews",
      "ventureReviews",
      "contaminationReports",
      "suggestions",
      "ventureSuggestions",
      "contacts",
      "pushTokens",
      "rateLimits",
      "googleGrants",
      "appleGrants",
      "handoffs",
      "jobs",
      "destroyed",
    ] as const) {
      ;(s[key] as unknown[]).length = 0
    }

    s.users.set(userId, {
      _id: new Types.ObjectId(userId),
      email: "u@example.com",
      name: "User",
    })
    s.users.set(otherUserId, {
      _id: new Types.ObjectId(otherUserId),
      email: "o@example.com",
      name: "Other",
    })
    s.favorites.push(
      { userId: new Types.ObjectId(userId) },
      { userId: new Types.ObjectId(otherUserId) }
    )
    s.reviews.push({
      userId: new Types.ObjectId(userId),
      evidencePhotos: [
        "https://res.cloudinary.com/demo/image/upload/v1/celimap/photo.jpg",
      ],
    })
    s.reviews.push({
      userId: new Types.ObjectId(otherUserId),
      evidencePhotos: [],
    })
    process.env.ACCOUNT_DELETION_USE_TXN = "0"
    process.env.CLOUDINARY_CLOUD_NAME = "demo"
  })

  it("exige confirmación ELIMINAR", async () => {
    await expect(
      deleteAuthenticatedAccount({
        authenticatedUserId: userId,
        confirm: "no",
      })
    ).rejects.toBeInstanceOf(AccountDeletionError)
  })

  it("rechaza userId inválido", async () => {
    await expect(
      deleteAuthenticatedAccount({
        authenticatedUserId: "not-an-id",
        confirm: ACCOUNT_DELETE_CONFIRM,
      })
    ).rejects.toMatchObject({ code: "invalid_user_id" })
  })

  it("elimina datos del usuario y deja intactos los de terceros", async () => {
    const result = await deleteAuthenticatedAccount({
      authenticatedUserId: userId,
      confirm: ACCOUNT_DELETE_CONFIRM,
    })
    expect(result.ok).toBe(true)
    expect(store().users.has(userId)).toBe(false)
    expect(store().users.has(otherUserId)).toBe(true)
    expect(
      store().favorites.some((f) => idStr(f.userId) === userId)
    ).toBe(false)
    expect(
      store().favorites.some((f) => idStr(f.userId) === otherUserId)
    ).toBe(true)
    expect(store().destroyed.length).toBeGreaterThan(0)
  })

  it("doble request es idempotente cuando ya completó", async () => {
    await deleteAuthenticatedAccount({
      authenticatedUserId: userId,
      confirm: ACCOUNT_DELETE_CONFIRM,
    })
    store().jobs[0].status = "completed"
    store().jobs[0].appleRevoke = "not_applicable"
    store().jobs[0].cloudinaryPendingPublicIds = []
    const second = await deleteAuthenticatedAccount({
      authenticatedUserId: userId,
      confirm: ACCOUNT_DELETE_CONFIRM,
    })
    expect(second.alreadyDeleted).toBe(true)
  })

  it("request concurrente con job claimed reciente → 409", async () => {
    store().jobs.push({
      userId,
      status: "claimed",
      claimedAt: new Date(),
      appleRevoke: "not_applicable",
      cloudinaryPendingPublicIds: [],
    })
    await expect(
      deleteAuthenticatedAccount({
        authenticatedUserId: userId,
        confirm: ACCOUNT_DELETE_CONFIRM,
      })
    ).rejects.toMatchObject({ code: "concurrent" })
  })

  it("cuenta Apple sin reauth → manual_required y aún borra", async () => {
    store().users.set(userId, {
      _id: new Types.ObjectId(userId),
      email: "a@example.com",
      name: "Apple User",
      appleSub: "apple-sub-1",
    })
    const result = await deleteAuthenticatedAccount({
      authenticatedUserId: userId,
      confirm: ACCOUNT_DELETE_CONFIRM,
    })
    expect(result.appleRevoke).toBe("manual_required")
    expect(result.appleManualInstructions).toBe(true)
    expect(store().users.has(userId)).toBe(false)
  })

  it("reauth Apple con sub distinto falla y no borra", async () => {
    const { verifyAppleIdToken } = jest.requireMock("@/lib/native-apple-auth")
    verifyAppleIdToken.mockResolvedValueOnce({
      sub: "other-sub",
      emailVerified: true,
    })
    store().users.set(userId, {
      _id: new Types.ObjectId(userId),
      email: "a@example.com",
      name: "Apple User",
      appleSub: "apple-sub-1",
    })
    await expect(
      deleteAuthenticatedAccount({
        authenticatedUserId: userId,
        confirm: ACCOUNT_DELETE_CONFIRM,
        apple: {
          challengeId: "challenge-id-123456",
          idToken: "token",
          authorizationCode: "authcode",
        },
      })
    ).rejects.toMatchObject({ code: "apple_sub_mismatch" })
    expect(store().users.has(userId)).toBe(true)
  })

  it("reauth + revoke OK", async () => {
    store().users.set(userId, {
      _id: new Types.ObjectId(userId),
      email: "a@example.com",
      name: "Apple User",
      appleSub: "apple-sub-1",
    })
    const result = await deleteAuthenticatedAccount({
      authenticatedUserId: userId,
      confirm: ACCOUNT_DELETE_CONFIRM,
      apple: {
        challengeId: "challenge-id-123456",
        idToken: "token",
        authorizationCode: "authcode",
      },
      appleRevokeFn: async () => ({ ok: true, code: "revoked" }),
    })
    expect(result.appleRevoke).toBe("revoked")
    expect(store().users.has(userId)).toBe(false)
  })
})

describe("apple-token-revoke keys", () => {
  it("missing keys → missing_keys", async () => {
    const team = process.env.APPLE_TEAM_ID
    const key = process.env.APPLE_KEY_ID
    const pem = process.env.APPLE_PRIVATE_KEY
    delete process.env.APPLE_TEAM_ID
    delete process.env.APPLE_KEY_ID
    delete process.env.APPLE_PRIVATE_KEY
    const r = await exchangeAndRevokeAppleAuthorization("code")
    expect(r.code).toBe("missing_keys")
    if (team) process.env.APPLE_TEAM_ID = team
    if (key) process.env.APPLE_KEY_ID = key
    if (pem) process.env.APPLE_PRIVATE_KEY = pem
  })
})
