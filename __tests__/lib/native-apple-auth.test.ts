/**
 * @jest-environment node
 */
import {
  SignJWT,
  exportJWK,
  generateKeyPair,
  createLocalJWKSet,
  type JWK,
} from "jose"
import {
  AppleAuthError,
  appleRequestNonceFromRaw,
  consumeNativeAppleGrant,
  createNativeAppleGrant,
  sha256Hex,
  upsertUserFromAppleIdentity,
  verifyAppleIdToken,
  __resetAppleJwksForTests,
  APPLE_ISSUER,
  DEFAULT_APPLE_AUDIENCE,
} from "@/lib/native-apple-auth"

jest.mock("@/lib/mongodb", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}))

const mockUserStore: Array<Record<string, unknown>> = []

jest.mock("@/models/User", () => {
  class FakeUser {
    email!: string
    name!: string
    appleSub?: string
    role!: string
    image?: string
    _id = { toString: () => `id-${this.appleSub || this.email}` }
    constructor(data: Record<string, unknown>) {
      Object.assign(this, data)
    }
    async save() {
      return this
    }
  }
  return {
    User: {
      findOne: jest.fn(async (query: Record<string, unknown>) => {
        if (query.appleSub) {
          return mockUserStore.find((u) => u.appleSub === query.appleSub) || null
        }
        if (query.email) {
          return mockUserStore.find((u) => u.email === query.email) || null
        }
        return null
      }),
      findById: jest.fn(async (id: string) => {
        return (
          mockUserStore.find(
            (u) => (u._id as { toString: () => string }).toString() === id
          ) || null
        )
      }),
      create: jest.fn(async (data: Record<string, unknown>) => {
        if (mockUserStore.some((u) => u.appleSub === data.appleSub)) {
          const err = new Error("duplicate") as Error & { code: number }
          err.code = 11000
          throw err
        }
        if (mockUserStore.some((u) => u.email === data.email)) {
          const err = new Error("duplicate") as Error & { code: number }
          err.code = 11000
          throw err
        }
        const user = new FakeUser(data)
        mockUserStore.push(user as unknown as Record<string, unknown>)
        return user
      }),
    },
  }
})

const mockGrants: Array<Record<string, unknown>> = []

jest.mock("@/models/NativeAppleGrant", () => ({
  NativeAppleGrant: {
    create: jest.fn(async (data: Record<string, unknown>) => {
      mockGrants.push({ ...data, used: false })
      return data
    }),
    findOneAndUpdate: jest.fn(
      async (
        filter: Record<string, unknown>,
        update: { $set: Record<string, unknown> }
      ) => {
        const doc = mockGrants.find(
          (g) =>
            g.code === filter.code &&
            g.used === false &&
            (g.expiresAt as Date) > new Date()
        )
        if (!doc) return null
        Object.assign(doc, update.$set)
        return { ...doc, userId: doc.userId }
      }
    ),
  },
}))

jest.mock("@/models/NativeAppleChallenge", () => ({
  NativeAppleChallenge: {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}))

describe("Apple nonce hashing", () => {
  it("SHA-256 hex matches Node crypto", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
    expect(appleRequestNonceFromRaw("abc")).toBe(sha256Hex("abc"))
  })
})

describe("verifyAppleIdToken", () => {
  let privateKey: Awaited<ReturnType<typeof generateKeyPair>>["privateKey"]
  let getKey: ReturnType<typeof createLocalJWKSet>
  const prevAud = process.env.APPLE_CLIENT_ID

  beforeAll(async () => {
    const pair = await generateKeyPair("ES256")
    privateKey = pair.privateKey
    const jwk = (await exportJWK(pair.publicKey)) as JWK
    jwk.kid = "test-kid"
    jwk.alg = "ES256"
    getKey = createLocalJWKSet({ keys: [jwk] })
  })

  beforeEach(() => {
    __resetAppleJwksForTests()
    process.env.APPLE_CLIENT_ID = DEFAULT_APPLE_AUDIENCE
    mockUserStore.length = 0
    mockGrants.length = 0
  })

  afterAll(() => {
    process.env.APPLE_CLIENT_ID = prevAud
  })

  async function signToken(claims: Record<string, unknown>, expSec = 3600) {
    const now = Math.floor(Date.now() / 1000)
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", kid: "test-kid" })
      .setIssuer(APPLE_ISSUER)
      .setAudience(DEFAULT_APPLE_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + expSec)
      .setSubject(String(claims.sub ?? "apple-sub-1"))
      .sign(privateKey)
  }

  it("acepta token válido con private relay", async () => {
    const raw = "nonce-raw-1"
    const hash = appleRequestNonceFromRaw(raw)
    const idToken = await signToken({
      sub: "apple-sub-1",
      email: "x@privaterelay.appleid.com",
      email_verified: true,
      nonce: hash,
    })
    const identity = await verifyAppleIdToken({
      idToken,
      expectedNonceHash: hash,
      getKey,
    })
    expect(identity.sub).toBe("apple-sub-1")
    expect(identity.email).toBe("x@privaterelay.appleid.com")
    expect(identity.emailVerified).toBe(true)
  })

  it("rechaza firma inválida", async () => {
    const other = await generateKeyPair("ES256")
    const hash = appleRequestNonceFromRaw("n")
    const now = Math.floor(Date.now() / 1000)
    const idToken = await new SignJWT({
      sub: "s",
      nonce: hash,
      email: "a@b.com",
      email_verified: true,
    })
      .setProtectedHeader({ alg: "ES256", kid: "test-kid" })
      .setIssuer(APPLE_ISSUER)
      .setAudience(DEFAULT_APPLE_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(other.privateKey)

    await expect(
      verifyAppleIdToken({ idToken, expectedNonceHash: hash, getKey })
    ).rejects.toMatchObject({ code: "invalid_token" })
  })

  it("rechaza issuer incorrecto", async () => {
    const hash = appleRequestNonceFromRaw("n2")
    const now = Math.floor(Date.now() / 1000)
    const idToken = await new SignJWT({
      sub: "s",
      nonce: hash,
      email: "a@b.com",
      email_verified: true,
    })
      .setProtectedHeader({ alg: "ES256", kid: "test-kid" })
      .setIssuer("https://evil.example")
      .setAudience(DEFAULT_APPLE_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey)

    await expect(
      verifyAppleIdToken({ idToken, expectedNonceHash: hash, getKey })
    ).rejects.toMatchObject({ code: "invalid_token" })
  })

  it("rechaza audience incorrecto", async () => {
    const hash = appleRequestNonceFromRaw("n3")
    const now = Math.floor(Date.now() / 1000)
    const idToken = await new SignJWT({
      sub: "s",
      nonce: hash,
      email: "a@b.com",
      email_verified: true,
    })
      .setProtectedHeader({ alg: "ES256", kid: "test-kid" })
      .setIssuer(APPLE_ISSUER)
      .setAudience("com.other.app")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey)

    await expect(
      verifyAppleIdToken({ idToken, expectedNonceHash: hash, getKey })
    ).rejects.toMatchObject({ code: "invalid_token" })
  })

  it("rechaza token vencido", async () => {
    const hash = appleRequestNonceFromRaw("n4")
    const now = Math.floor(Date.now() / 1000)
    const idToken = await new SignJWT({
      sub: "s",
      nonce: hash,
      email: "a@b.com",
      email_verified: true,
    })
      .setProtectedHeader({ alg: "ES256", kid: "test-kid" })
      .setIssuer(APPLE_ISSUER)
      .setAudience(DEFAULT_APPLE_AUDIENCE)
      .setIssuedAt(now - 7200)
      .setExpirationTime(now - 3600)
      .sign(privateKey)

    await expect(
      verifyAppleIdToken({ idToken, expectedNonceHash: hash, getKey })
    ).rejects.toMatchObject({ code: "invalid_token" })
  })

  it("rechaza sin sub", async () => {
    const hash = appleRequestNonceFromRaw("n5")
    const now = Math.floor(Date.now() / 1000)
    const idToken = await new SignJWT({
      nonce: hash,
      email: "a@b.com",
      email_verified: true,
    })
      .setProtectedHeader({ alg: "ES256", kid: "test-kid" })
      .setIssuer(APPLE_ISSUER)
      .setAudience(DEFAULT_APPLE_AUDIENCE)
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey)

    await expect(
      verifyAppleIdToken({ idToken, expectedNonceHash: hash, getKey })
    ).rejects.toBeInstanceOf(AppleAuthError)
  })

  it("rechaza nonce incorrecto", async () => {
    const idToken = await signToken({
      sub: "s",
      email: "a@b.com",
      email_verified: true,
      nonce: appleRequestNonceFromRaw("good"),
    })
    await expect(
      verifyAppleIdToken({
        idToken,
        expectedNonceHash: appleRequestNonceFromRaw("bad"),
        getKey,
      })
    ).rejects.toMatchObject({ code: "invalid_nonce" })
  })

  it("email_verified true (boolean) acepta", async () => {
    const hash = appleRequestNonceFromRaw("ev-bool")
    const idToken = await signToken({
      sub: "s-ev1",
      email: "a@privaterelay.appleid.com",
      email_verified: true,
      nonce: hash,
    })
    await expect(
      verifyAppleIdToken({ idToken, expectedNonceHash: hash, getKey })
    ).resolves.toMatchObject({ emailVerified: true })
  })

  it('email_verified "true" (string) acepta', async () => {
    const hash = appleRequestNonceFromRaw("ev-str")
    const idToken = await signToken({
      sub: "s-ev2",
      email: "b@privaterelay.appleid.com",
      email_verified: "true",
      nonce: hash,
    })
    await expect(
      verifyAppleIdToken({ idToken, expectedNonceHash: hash, getKey })
    ).resolves.toMatchObject({ emailVerified: true })
  })

  it("email_verified false rechaza cuando hay email", async () => {
    const hash = appleRequestNonceFromRaw("n6")
    const idToken = await signToken({
      sub: "s",
      email: "a@b.com",
      email_verified: false,
      nonce: hash,
    })
    await expect(
      verifyAppleIdToken({ idToken, expectedNonceHash: hash, getKey })
    ).rejects.toMatchObject({ code: "email_unverified" })
  })

  it('email_verified "false" rechaza cuando hay email', async () => {
    const hash = appleRequestNonceFromRaw("n6b")
    const idToken = await signToken({
      sub: "s",
      email: "a@b.com",
      email_verified: "false",
      nonce: hash,
    })
    await expect(
      verifyAppleIdToken({ idToken, expectedNonceHash: hash, getKey })
    ).rejects.toMatchObject({ code: "email_unverified" })
  })

  it("claim email_verified ausente con email presente → rechaza", async () => {
    const hash = appleRequestNonceFromRaw("n6c")
    const idToken = await signToken({
      sub: "s",
      email: "a@b.com",
      nonce: hash,
    })
    await expect(
      verifyAppleIdToken({ idToken, expectedNonceHash: hash, getKey })
    ).rejects.toMatchObject({ code: "email_unverified" })
  })

  it("login posterior sin email (solo sub+nonce) acepta", async () => {
    const hash = appleRequestNonceFromRaw("n6d")
    const idToken = await signToken({
      sub: "known-sub",
      nonce: hash,
    })
    const identity = await verifyAppleIdToken({
      idToken,
      expectedNonceHash: hash,
      getKey,
    })
    expect(identity.sub).toBe("known-sub")
    expect(identity.email).toBeUndefined()
    expect(identity.emailVerified).toBe(false)
  })
})

describe("getAppleAudienceAllowlist", () => {
  const prev = process.env.APPLE_CLIENT_ID

  afterEach(() => {
    process.env.APPLE_CLIENT_ID = prev
  })

  it("siempre incluye com.celimap.app; vacío no desactiva", async () => {
    const { getAppleAudienceAllowlist, DEFAULT_APPLE_AUDIENCE } = await import(
      "@/lib/native-apple-auth"
    )
    process.env.APPLE_CLIENT_ID = "   "
    expect(getAppleAudienceAllowlist()).toContain(DEFAULT_APPLE_AUDIENCE)
    process.env.APPLE_CLIENT_ID = "com.other.app"
    const list = getAppleAudienceAllowlist()
    expect(list).toContain("com.other.app")
    expect(list).toContain(DEFAULT_APPLE_AUDIENCE)
  })
})

describe("upsertUserFromAppleIdentity", () => {
  beforeEach(() => {
    mockUserStore.length = 0
  })

  it("primer login crea usuario con appleSub", async () => {
    const user = await upsertUserFromAppleIdentity(
      {
        sub: "sub-new",
        email: "new@privaterelay.appleid.com",
        emailVerified: true,
      },
      { givenName: "Ana", familyName: "Pérez" }
    )
    expect(user.appleSub).toBe("sub-new")
    expect(user.name).toBe("Ana Pérez")
    expect(user.email).toBe("new@privaterelay.appleid.com")
  })

  it("login posterior sin nombre/email reusa mismo usuario", async () => {
    await upsertUserFromAppleIdentity({
      sub: "sub-stable",
      email: "keep@example.com",
      emailVerified: true,
    }, { givenName: "Bob", familyName: null })
    const again = await upsertUserFromAppleIdentity({
      sub: "sub-stable",
      emailVerified: false,
    })
    expect(again.email).toBe("keep@example.com")
    expect(again.name).toBe("Bob")
  })

  it("Hide My Email (privaterelay) crea y recupera por appleSub", async () => {
    const first = await upsertUserFromAppleIdentity({
      sub: "relay-sub",
      email: "hidden@privaterelay.appleid.com",
      emailVerified: true,
    })
    expect(first.email).toBe("hidden@privaterelay.appleid.com")
    const again = await upsertUserFromAppleIdentity({
      sub: "relay-sub",
      emailVerified: false,
    })
    expect(again.appleSub).toBe("relay-sub")
    expect(again.email).toBe("hidden@privaterelay.appleid.com")
  })

  it("primer acceso sin email usa appleSub y email sintético estable", async () => {
    const user = await upsertUserFromAppleIdentity({
      sub: "sub-no-email",
      emailVerified: false,
    })
    expect(user.appleSub).toBe("sub-no-email")
    expect(user.email).toMatch(
      /^apple-[a-f0-9]+@privaterelay\.celimap\.internal$/
    )
    const again = await upsertUserFromAppleIdentity({
      sub: "sub-no-email",
      emailVerified: false,
    })
    expect(again.email).toBe(user.email)
  })

  it("colisión de email con cuenta sin appleSub → rechazo", async () => {
    mockUserStore.push({
      email: "shared@example.com",
      name: "Google User",
      role: "user",
      _id: { toString: () => "g1" },
    })
    await expect(
      upsertUserFromAppleIdentity({
        sub: "apple-x",
        email: "shared@example.com",
        emailVerified: true,
      })
    ).rejects.toMatchObject({ code: "email_other_provider" })
  })

  it("mismo sub concurrente (duplicate key) recupera usuario", async () => {
    const first = await upsertUserFromAppleIdentity({
      sub: "race-sub",
      email: "race@example.com",
      emailVerified: true,
    })
    // Force create path again with same sub already in store → unique race
    const { User } = jest.requireMock("@/models/User") as {
      User: { findOne: jest.Mock; create: jest.Mock }
    }
    User.findOne.mockResolvedValueOnce(null)
    const second = await upsertUserFromAppleIdentity({
      sub: "race-sub",
      email: "race@example.com",
      emailVerified: true,
    })
    expect(second.appleSub || first.appleSub).toBe("race-sub")
  })
})

describe("NativeAppleGrant", () => {
  beforeEach(() => {
    mockGrants.length = 0
    mockUserStore.length = 0
    mockUserStore.push({
      email: "u@example.com",
      name: "U",
      role: "user",
      appleSub: "s",
      _id: { toString: () => "user-1" },
    })
    const { User } = jest.requireMock("@/models/User") as {
      User: { findById: jest.Mock }
    }
    User.findById.mockImplementation(async (id: string) =>
      mockUserStore.find((u) => (u._id as { toString: () => string }).toString() === id)
    )
  })

  it("grant válido se consume una vez", async () => {
    const code = await createNativeAppleGrant("user-1")
    const once = await consumeNativeAppleGrant(code)
    expect(once?.email).toBe("u@example.com")
    const twice = await consumeNativeAppleGrant(code)
    expect(twice).toBeNull()
  })

  it("grant corto / inválido → null", async () => {
    expect(await consumeNativeAppleGrant("short")).toBeNull()
  })

  it("grant estilo Google no es aceptado por native-apple", async () => {
    const googleLooking = "a".repeat(64)
    expect(await consumeNativeAppleGrant(googleLooking)).toBeNull()
  })
})
