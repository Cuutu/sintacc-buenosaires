/**
 * @jest-environment node
 */
jest.mock("@/lib/wallet/wallet-images", () => ({
  googleLogoUrl: async () => "https://res.cloudinary.com/demo/image/upload/wallet/logo-v1.png",
  googleHeroUrl: async (stamps: number, total: number, safety: string | null) =>
    `https://res.cloudinary.com/demo/image/upload/wallet/sellos-v1-${stamps}-${total}${safety ? `-${safety}` : ""}.png`,
}))
const mockWarn = jest.fn()
jest.mock("@/lib/logger", () => ({ logger: { warn: (...a: unknown[]) => mockWarn(...a) } }))

import { exportPKCS8, generateKeyPair, jwtVerify, type KeyLike } from "jose"
import {
  buildLoyaltyClass,
  buildLoyaltyObject,
  getGoogleWalletConfig,
  googleSaveLink,
  pushGoogleCardUpdate,
  pushGoogleProgramNotice,
  refreshGoogleCard,
  type GoogleCardInput,
  type GoogleWalletConfig,
} from "@/lib/wallet/google-wallet"

const ENV_KEYS = [
  "GOOGLE_WALLET_ISSUER_ID",
  "GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_WALLET_PRIVATE_KEY",
] as const

const input: GoogleCardInput = {
  programId: "6650a1b2c3d4e5f601234567",
  serialNumber: "a".repeat(32),
  barcodeValue: `https://www.celimap.com.ar/local/sellar/${"a".repeat(32)}`,
  stamps: 3,
  stampsForReward: 10,
  reward: "Cookie",
  placeName: "Polvorín",
  placePath: "/lugar/polvorin",
}

type Call = { url: string; method: string; body: Record<string, unknown> | null }

function mockFetch(responses: Record<string, number>) {
  const calls: Call[] = []
  global.fetch = jest.fn(async (url: string | URL, init?: RequestInit) => {
    const href = String(url)
    const method = init?.method ?? "GET"
    if (href.startsWith("https://oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 })
    }
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : null
    calls.push({ url: href, method, body })
    const key = `${method} ${href.replace("https://walletobjects.googleapis.com/walletobjects/v1", "")}`
    const match = Object.keys(responses).find((k) => key.startsWith(k))
    return new Response("{}", { status: match ? responses[match] : 200 })
  }) as unknown as typeof fetch
  return calls
}

describe("google wallet loyalty card", () => {
  const saved: Record<string, string | undefined> = {}
  const realFetch = global.fetch
  let config: GoogleWalletConfig
  let publicKey: KeyLike

  beforeAll(async () => {
    for (const k of ENV_KEYS) saved[k] = process.env[k]
    const pair = await generateKeyPair("RS256", { extractable: true })
    const privateKey = pair.privateKey
    publicKey = pair.publicKey
    process.env.GOOGLE_WALLET_ISSUER_ID = "3388000000023221580"
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = "wallet@celimap.iam.gserviceaccount.com"
    // Como queda pegada desde el JSON de la cuenta de servicio.
    process.env.GOOGLE_WALLET_PRIVATE_KEY = (await exportPKCS8(privateKey)).replace(/\n/g, "\\n")
    config = getGoogleWalletConfig() as GoogleWalletConfig
  })

  afterAll(() => {
    global.fetch = realFetch
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  beforeEach(() => mockWarn.mockClear())

  it("is off until the three env vars are set", () => {
    expect(config.privateKey).toContain("-----BEGIN PRIVATE KEY-----\n")
    const email = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL
    delete process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL
    expect(getGoogleWalletConfig()).toBeNull()
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL = email
  })

  it("builds one olive class per program", () => {
    const loyaltyClass = buildLoyaltyClass(config, input, "https://img/logo.png")
    expect(loyaltyClass).toMatchObject({
      id: "3388000000023221580.celimap_programa_6650a1b2c3d4e5f601234567",
      issuerName: "CeliMap",
      programName: "Polvorín",
      hexBackgroundColor: "#2D4A34",
      reviewStatus: "UNDER_REVIEW",
    })
    expect(loyaltyClass.programLogo.sourceUri.uri).toBe("https://img/logo.png")
  })

  it("tells a 100% place from one with options, like the map", async () => {
    const calls = mockFetch({})
    await googleSaveLink({ ...input, safety: "dedicated" }, config)
    const [klass, object] = calls.map((c) => c.body as Record<string, unknown>)
    expect(klass.hexBackgroundColor).toBe("#2D4A34")
    expect((object.heroImage as { sourceUri: { uri: string } }).sourceUri.uri).toMatch(/-dedicated\.png$/)
    expect(object.textModulesData).toContainEqual({
      id: "tacc",
      header: "100% sin TACC",
      body: "Según CeliMap, este lugar es 100% sin TACC. Igual, confirmá siempre con el local.",
    })
    expect(buildLoyaltyClass(config, { ...input, safety: "options" }, "https://img/logo.png").hexBackgroundColor).toBe(
      "#A84A26"
    )
    const plain = buildLoyaltyObject(config, input, null)
    expect(plain.textModulesData.map((m) => m.id)).toEqual(["how"])
  })

  it("gives Google the place's location so Android can show the card nearby", () => {
    const near = buildLoyaltyClass(
      config,
      { ...input, location: { latitude: -38.7183, longitude: -62.2663 } },
      "https://img/logo.png"
    )
    expect(near.merchantLocations).toEqual([{ latitude: -38.7183, longitude: -62.2663 }])
    expect(buildLoyaltyClass(config, input, "https://img/logo.png")).not.toHaveProperty("merchantLocations")
  })

  it("puts stamps, prize, stamp QR and the stamp image on the card", () => {
    const object = buildLoyaltyObject(config, { ...input, stamps: 99 }, "https://img/hero.png")
    expect(object.id).toBe(`3388000000023221580.celimap_tarjeta_${"a".repeat(32)}`)
    expect(object.id).toMatch(/^\d+\.[A-Za-z0-9._-]+$/)
    expect(object.loyaltyPoints.balance.string).toBe("10/10")
    expect(object.secondaryLoyaltyPoints.balance.string).toBe("Cookie")
    expect(object.barcode).toEqual({ type: "QR_CODE", value: input.barcodeValue })
    expect(object.heroImage?.sourceUri.uri).toBe("https://img/hero.png")
    expect(buildLoyaltyObject(config, input, null)).not.toHaveProperty("heroImage")
  })

  it("creates class and card (or updates them) and returns a signed save link", async () => {
    const calls = mockFetch({ "POST /loyaltyClass": 409 })
    const link = await googleSaveLink(input, config)

    expect(calls.map((c) => `${c.method} ${c.url.split("/v1")[1].split("/").slice(0, 2).join("/")}`)).toEqual([
      "POST /loyaltyClass",
      "PATCH /loyaltyClass",
      "POST /loyaltyObject",
    ])
    expect(calls[2].body?.heroImage).toBeTruthy()

    expect(link.startsWith("https://pay.google.com/gp/v/save/")).toBe(true)
    const { payload: claims } = await jwtVerify(link.split("/save/")[1], publicKey)
    expect(claims).toMatchObject({
      iss: "wallet@celimap.iam.gserviceaccount.com",
      aud: "google",
      typ: "savetowallet",
      payload: {
        loyaltyObjects: [
          {
            id: `3388000000023221580.celimap_tarjeta_${"a".repeat(32)}`,
            classId: "3388000000023221580.celimap_programa_6650a1b2c3d4e5f601234567",
          },
        ],
      },
    })
  })

  it("updates the saved card and sends the stamp notice", async () => {
    const calls = mockFetch({})
    await pushGoogleCardUpdate({ ...input, stamps: 4 }, config)
    expect(calls).toHaveLength(2)
    expect(calls[0].method).toBe("PATCH")
    expect(calls[0].body).toMatchObject({ messages: [], loyaltyPoints: { balance: { string: "4/10" } } })
    expect(calls[1].url).toMatch(/\/addMessage$/)
    expect(calls[1].body).toMatchObject({
      message: {
        messageType: "TEXT_AND_NOTIFY",
        body: "¡Sumaste un sello en Polvorín! Te faltan 6 para tu premio: Cookie.",
      },
    })
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it("sends the shop's notice to every card through the class", async () => {
    const calls = mockFetch({})
    const now = new Date("2026-10-16T12:00:00.123Z")
    expect(await pushGoogleProgramNotice(input, "Salieron las medialunas", config, now)).toBe(true)
    expect(calls).toHaveLength(2)
    expect(calls[0].method).toBe("PATCH")
    expect(calls[0].url).toMatch(/\/loyaltyClass\/3388000000023221580\.celimap_programa_6650a1b2c3d4e5f601234567$/)
    expect(calls[0].body).toMatchObject({ messages: [], programName: "Polvorín" })
    expect(calls[1].url).toMatch(/\/loyaltyClass\/.+\/addMessage$/)
    expect(calls[1].body).toEqual({
      message: {
        id: `aviso_${now.getTime()}`,
        header: "Aviso de Polvorín",
        body: "Salieron las medialunas",
        messageType: "TEXT_AND_NOTIFY",
        displayInterval: { start: { date: "2026-10-16T12:00:00Z" }, end: { date: "2026-10-23T12:00:00Z" } },
      },
    })
  })

  it("skips the notice when nobody saved the card in Google, and never throws", async () => {
    const calls = mockFetch({ "PATCH /loyaltyClass": 404 })
    expect(await pushGoogleProgramNotice(input, "Hola", config)).toBe(false)
    expect(calls).toHaveLength(1)
    mockFetch({ "POST /loyaltyClass": 500 })
    expect(await pushGoogleProgramNotice(input, "Hola", config)).toBe(false)
    expect(mockWarn).toHaveBeenCalledWith(expect.objectContaining({ route: "wallet-google" }))
  })

  it("never throws when Google fails (the stamp is already saved)", async () => {
    mockFetch({ "PATCH /loyaltyObject": 500 })
    await expect(pushGoogleCardUpdate(input, config)).resolves.toBeUndefined()
    expect(mockWarn).toHaveBeenCalledWith(expect.objectContaining({ route: "wallet-google" }))
  })

  it("skips the notice for a card that is not in Google", async () => {
    const calls = mockFetch({ "PATCH /loyaltyObject": 404 })
    await pushGoogleCardUpdate(input, config)
    expect(calls).toHaveLength(1)
    expect(mockWarn).not.toHaveBeenCalled()
  })
  it("shows the double-stamp hours on the card", () => {
    const object = buildLoyaltyObject(config, { ...input, doubleStamp: "Sello doble los martes de 15 a 18 h." }, null)
    expect(object.textModulesData).toContainEqual({
      id: "double",
      header: "Sello doble",
      body: "Sello doble los martes de 15 a 18 h.",
    })
    expect(buildLoyaltyObject(config, input, null).textModulesData.map((m) => m.id)).not.toContain("double")
  })

  it("refreshes a card without notifying the phone", async () => {
    const calls = mockFetch({})
    expect(await refreshGoogleCard({ ...input, doubleStamp: "Sello doble." }, config)).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe("PATCH")
    expect(calls[0].body).not.toHaveProperty("messages")

    mockFetch({ "PATCH /loyaltyObject": 404 })
    expect(await refreshGoogleCard(input, config)).toBe(false)
    expect(mockWarn).not.toHaveBeenCalled()
  })
  it("adds the customer's invite link to the card", () => {
    const inviteUrl = "https://www.celimap.com.ar/tarjeta/p1?amigo=c1"
    const object = buildLoyaltyObject(config, { ...input, inviteUrl }, null)
    expect(object.linksModuleData.uris[0]).toEqual({
      id: "invite",
      uri: inviteUrl,
      description: "Traé un amigo: link para compartir",
    })
    expect(object.textModulesData.map((m) => m.id)).toContain("invite")
    expect(buildLoyaltyObject(config, input, null).linksModuleData.uris.map((u) => u.id)).toEqual(["place"])
  })
})
