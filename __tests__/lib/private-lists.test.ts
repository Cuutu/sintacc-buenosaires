import {
  canUsePrivateLists,
  isPrivateLinkActive,
  isPublicListVisibility,
  publicListsQuery,
} from "@/lib/lists/access"
import { LIST_LINK_STATUS, LIST_VISIBILITY } from "@/lib/lists/constants"
import {
  generatePrivateListToken,
  isValidPrivateTokenFormat,
  redactPrivateListToken,
  redactPrivateListTokenDeep,
} from "@/lib/lists/private-token"
import {
  applyVisibilityFields,
  normalizePlaceIdStrings,
  normalizePlaceNotes,
} from "@/lib/lists/normalize"
import {
  serializeListForCommunity,
  serializeListForOwner,
  serializeListForPublicViewer,
} from "@/lib/lists/serialize"

describe("private lists access", () => {
  const prevEnabled = process.env.PRIVATE_LISTS_ENABLED
  const prevAllow = process.env.PRIVATE_LISTS_ALLOWLIST

  afterEach(() => {
    process.env.PRIVATE_LISTS_ENABLED = prevEnabled
    process.env.PRIVATE_LISTS_ALLOWLIST = prevAllow
  })

  it("flag off bloquea a todos", () => {
    process.env.PRIVATE_LISTS_ENABLED = "false"
    process.env.PRIVATE_LISTS_ALLOWLIST = "creator@example.com"
    expect(
      canUsePrivateLists({ email: "creator@example.com", role: "admin" })
    ).toBe(false)
  })

  it("admin permitido con flag on", () => {
    process.env.PRIVATE_LISTS_ENABLED = "true"
    process.env.PRIVATE_LISTS_ALLOWLIST = ""
    expect(canUsePrivateLists({ email: "x@y.com", role: "admin" })).toBe(true)
  })

  it("allowlist permite email autorizado", () => {
    process.env.PRIVATE_LISTS_ENABLED = "true"
    process.env.PRIVATE_LISTS_ALLOWLIST = "celiacos@viajeros.com, otro@test.com"
    expect(
      canUsePrivateLists({ email: "Celiacos@Viajeros.com", role: "user" })
    ).toBe(true)
    expect(
      canUsePrivateLists({ email: "no@autorizado.com", role: "user" })
    ).toBe(false)
  })

  it("publicListsQuery excluye PRIVATE_LINK vía isPublic", () => {
    const q = publicListsQuery()
    expect(q.isPublic).toBe(true)
  })

  it("isPublicListVisibility respeta PRIVATE_LINK", () => {
    expect(isPublicListVisibility(LIST_VISIBILITY.PRIVATE_LINK, true)).toBe(
      false
    )
    expect(isPublicListVisibility(LIST_VISIBILITY.PUBLIC, false)).toBe(true)
    expect(isPublicListVisibility(undefined, true)).toBe(true)
  })

  it("isPrivateLinkActive requiere token + active", () => {
    expect(
      isPrivateLinkActive({
        visibility: LIST_VISIBILITY.PRIVATE_LINK,
        linkStatus: LIST_LINK_STATUS.ACTIVE,
        privateAccessToken: "abc",
      })
    ).toBe(true)
    expect(
      isPrivateLinkActive({
        visibility: LIST_VISIBILITY.PRIVATE_LINK,
        linkStatus: LIST_LINK_STATUS.REVOKED,
        privateAccessToken: "abc",
      })
    ).toBe(false)
  })
})

describe("private token helpers", () => {
  it("genera token largo no secuencial", () => {
    const a = generatePrivateListToken()
    const b = generatePrivateListToken()
    expect(a).not.toEqual(b)
    expect(isValidPrivateTokenFormat(a)).toBe(true)
    expect(a.length).toBeGreaterThanOrEqual(32)
  })

  it("rechaza tokens cortos o con chars inválidos", () => {
    expect(isValidPrivateTokenFormat("abc")).toBe(false)
    expect(isValidPrivateTokenFormat("!!!!")).toBe(false)
  })

  it("redacta token en paths y objetos (logs/analytics)", () => {
    const token = generatePrivateListToken()
    const path = `/listas/privadas/${token}`
    expect(redactPrivateListToken(path)).toBe("/listas/privadas/[REDACTED]")
    expect(redactPrivateListToken(path)).not.toContain(token)

    const payload = redactPrivateListTokenDeep({
      route: path,
      privateAccessToken: token,
      nested: { url: `https://celimap.com.ar${path}` },
    })
    expect(JSON.stringify(payload)).not.toContain(token)
    expect(payload.privateAccessToken).toBe("[REDACTED]")
  })
})

describe("normalize place notes and order", () => {
  it("conserva orden de placeIds y notas asociadas", () => {
    const ids = normalizePlaceIdStrings([
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013",
    ])
    const notes = normalizePlaceNotes(
      [
        { placeId: "507f1f77bcf86cd799439013", note: " Tercera  " },
        { placeId: "507f1f77bcf86cd799439011", note: "Primera" },
        { placeId: "507f1f77bcf86cd799439099", note: "Ignorar" },
      ],
      ids
    )
    expect(ids).toEqual([
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012",
      "507f1f77bcf86cd799439013",
    ])
    expect(notes).toEqual([
      { placeId: "507f1f77bcf86cd799439011", note: "Primera" },
      { placeId: "507f1f77bcf86cd799439013", note: "Tercera" },
    ])
  })
})

describe("visibility fields", () => {
  it("PRIVATE_LINK genera token y isPublic false", () => {
    const fields = applyVisibilityFields({
      visibility: LIST_VISIBILITY.PRIVATE_LINK,
    })
    expect(fields.isPublic).toBe(false)
    expect(fields.visibility).toBe(LIST_VISIBILITY.PRIVATE_LINK)
    expect(fields.linkStatus).toBe(LIST_LINK_STATUS.ACTIVE)
    expect(fields.privateAccessToken).toBeTruthy()
  })

  it("PUBLIC limpia token", () => {
    const fields = applyVisibilityFields({
      visibility: LIST_VISIBILITY.PUBLIC,
      existingToken: "old-token",
    })
    expect(fields.isPublic).toBe(true)
    expect(fields.privateAccessToken).toBeNull()
    expect(fields.linkStatus).toBeNull()
  })
})

describe("serialize", () => {
  const base = {
    _id: "list1",
    name: "Privada María",
    isPublic: false,
    visibility: LIST_VISIBILITY.PRIVATE_LINK,
    privateAccessToken: "sekrettokensekrettokensekrettoken12",
    linkStatus: LIST_LINK_STATUS.ACTIVE,
    placeNotes: [{ placeId: "p1", note: "Pedí sin gluten" }],
  }

  it("owner recibe path privado", () => {
    const out = serializeListForOwner(base)
    expect(out.privateSharePath).toContain("/listas/privadas/")
    expect(out.privateAccessToken).toBeTruthy()
  })

  it("viewer público no recibe token ni status", () => {
    const out = serializeListForPublicViewer(base) as {
      privateAccessToken?: string
      linkStatus?: string
      privateSharePath?: string
      placeNotes?: Array<{ note?: string }>
    }
    expect(out.privateAccessToken).toBeUndefined()
    expect(out.linkStatus).toBeUndefined()
    expect(out.privateSharePath).toBeUndefined()
    expect(out.placeNotes?.[0]?.note).toBe("Pedí sin gluten")
  })

  it("community strippea campos privados", () => {
    const out = serializeListForCommunity({
      ...base,
      visibility: LIST_VISIBILITY.PUBLIC,
      isPublic: true,
    }) as { privateAccessToken?: string; placeNotes?: unknown }
    expect(out.privateAccessToken).toBeUndefined()
    expect(out.placeNotes).toBeUndefined()
  })
})
