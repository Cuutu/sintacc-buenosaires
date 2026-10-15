/**
 * @jest-environment node
 */
const mockRenderStrip = jest.fn()
jest.mock("@/lib/wallet/stamp-strip", () => ({
  renderStampStrip: (...args: unknown[]) => mockRenderStrip(...args),
  appleStripBox: (scale: number) => ({ width: 375 * scale, height: 144 * scale }),
}))
jest.mock("@/lib/logger", () => ({ logger: { warn: jest.fn() } }))

import {
  buildLoyaltyPass,
  formatStampDots,
  getApplePassConfig,
  type ApplePassConfig,
} from "@/lib/wallet/apple-pass"
import { nearbyText, stampNewsMessage } from "@/lib/wallet/card-text"

// node-forge viene con passkit-generator; acá sólo para fabricar certificados de prueba.
const forge = require("node-forge")

function selfSigned(commonName: string) {
  const keys = forge.pki.rsa.generateKeyPair(2048)
  const cert = forge.pki.createCertificate()
  cert.publicKey = keys.publicKey
  cert.serialNumber = "01"
  cert.validity.notBefore = new Date(Date.now() - 60_000)
  cert.validity.notAfter = new Date(Date.now() + 86_400_000)
  const attrs = [{ name: "commonName", value: commonName }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  cert.sign(keys.privateKey, forge.md.sha256.create())
  return {
    cert: forge.pki.certificateToPem(cert) as string,
    key: forge.pki.privateKeyToPem(keys.privateKey) as string,
  }
}

const ENV_KEYS = [
  "APPLE_PASS_TYPE_ID",
  "APPLE_TEAM_ID",
  "APPLE_PASS_TEAM_ID",
  "APPLE_PASS_CERT",
  "APPLE_PASS_KEY",
  "APPLE_WWDR_CERT",
  "APPLE_PASS_KEY_PASSPHRASE",
] as const

describe("apple wallet loyalty pass", () => {
  const saved: Record<string, string | undefined> = {}
  let config: ApplePassConfig

  beforeAll(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k]
    const signer = selfSigned("Pass Type ID: pass.com.celimap.test")
    const wwdr = selfSigned("Test WWDR")
    process.env.APPLE_PASS_TYPE_ID = "pass.com.celimap.test"
    process.env.APPLE_TEAM_ID = "TEAM123456"
    delete process.env.APPLE_PASS_TEAM_ID
    // Como queda en un .env de una sola línea
    process.env.APPLE_PASS_CERT = signer.cert.replace(/\r?\n/g, "\\n")
    process.env.APPLE_PASS_KEY = signer.key.replace(/\r?\n/g, "\\n")
    process.env.APPLE_WWDR_CERT = wwdr.cert
    delete process.env.APPLE_PASS_KEY_PASSPHRASE
    config = getApplePassConfig() as ApplePassConfig
  })

  beforeEach(() => {
    mockRenderStrip.mockReset()
    mockRenderStrip.mockImplementation(async (_s: number, _t: number, box: { width: number }) =>
      Buffer.from(`strip-${box.width}`)
    )
  })

  afterAll(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  })

  it("returns null when any certificate is missing", () => {
    const cert = process.env.APPLE_PASS_CERT
    delete process.env.APPLE_PASS_CERT
    expect(getApplePassConfig()).toBeNull()
    process.env.APPLE_PASS_CERT = cert
  })

  it("uses APPLE_TEAM_ID when there is no wallet-specific team", () => {
    expect(config.teamIdentifier).toBe("TEAM123456")
  })

  it("prefers APPLE_PASS_TEAM_ID over the Sign in with Apple team", () => {
    process.env.APPLE_PASS_TEAM_ID = " PASS987654 "
    try {
      expect(getApplePassConfig()?.teamIdentifier).toBe("PASS987654")
    } finally {
      delete process.env.APPLE_PASS_TEAM_ID
    }
    expect(process.env.APPLE_TEAM_ID).toBe("TEAM123456")
  })

  it("normalizes escaped newlines in PEM env vars", () => {
    expect(config.signerCert).toContain("-----BEGIN CERTIFICATE-----\n")
    expect(config.signerKey).not.toContain("\\n")
  })

  it("formats stamp dots and clamps out-of-range values", () => {
    expect(formatStampDots(2, 5)).toBe("●●○○○")
    expect(formatStampDots(9, 3)).toBe("●●●")
    expect(formatStampDots(-1, 2)).toBe("○○")
  })

  it("builds a signed storeCard pkpass", async () => {
    const buffer = await buildLoyaltyPass(
      {
        serialNumber: "demo-123",
        barcodeValue: "demo-123",
        stamps: 2,
        stampsForReward: 5,
        reward: "Un café de regalo",
        placeName: "Local de prueba",
      },
      config
    )
    const text = buffer.toString("latin1")
    expect(buffer.subarray(0, 2).toString()).toBe("PK")
    for (const name of ["pass.json", "manifest.json", "signature", "icon.png", "logo@2x.png"]) {
      expect(text).toContain(name)
    }
    expect(text).toContain('"storeCard"')
    expect(text).toContain('"passTypeIdentifier":"pass.com.celimap.test"')
    expect(text).toContain('"teamIdentifier":"TEAM123456"')
    expect(text).toContain('"serialNumber":"demo-123"')
    expect(text).toContain("PKBarcodeFormatQR")
  })

  it("draws the stamps as a strip image instead of dots", async () => {
    const text = (
      await buildLoyaltyPass(
        {
          serialNumber: "s2",
          barcodeValue: "s2",
          stamps: 7,
          stampsForReward: 5,
          reward: "Un café",
          placeName: "Local",
        },
        config
      )
    ).toString("latin1")
    expect(mockRenderStrip.mock.calls).toEqual([
      [5, 5, { width: 375, height: 144 }, null],
      [5, 5, { width: 750, height: 288 }, null],
      [5, 5, { width: 1125, height: 432 }, null],
    ])
    for (const name of ["strip.png", "strip@2x.png", "strip@3x.png"]) expect(text).toContain(name)
    expect(text).not.toContain('"primaryFields":[{')
    expect(text).toContain('"label":"LOCAL","value":"Local"')
    expect(text).toContain('"label":"PREMIO","value":"Un caf')
  })

  it("falls back to dots when the strip cannot be drawn", async () => {
    mockRenderStrip.mockRejectedValue(new Error("sin fuentes"))
    const buffer = await buildLoyaltyPass(
      {
        serialNumber: "s3",
        barcodeValue: "s3",
        stamps: 2,
        stampsForReward: 5,
        reward: "Un café",
        placeName: "Local",
      },
      config
    )
    const text = buffer.toString("utf8")
    expect(text).not.toContain("strip.png")
    expect(text).toContain("●●○○○")
  })

  it("labels the card with the place's TACC status, as on the map", async () => {
    const base = {
      serialNumber: "s5",
      barcodeValue: "s5",
      stamps: 1,
      stampsForReward: 5,
      reward: "Cookie",
      placeName: "Polvorin",
    }
    mockRenderStrip.mockResolvedValue(Buffer.from("png"))
    const labeled = (await buildLoyaltyPass({ ...base, safety: "dedicated" }, config)).toString("utf8")
    expect(mockRenderStrip).toHaveBeenLastCalledWith(1, 5, { width: 1125, height: 432 }, "dedicated")
    expect(labeled).toContain("Según CeliMap, este lugar es 100% sin TACC. Igual, confirmá siempre con el local.")
    expect(labeled).toContain('"backgroundColor":"rgb(45, 74, 52)"')

    const unlabeled = (await buildLoyaltyPass(base, config)).toString("utf8")
    expect(unlabeled).not.toContain("Según CeliMap")

    // Sin franja, la etiqueta va como texto en el frente.
    mockRenderStrip.mockRejectedValue(new Error("sin fuentes"))
    const fallback = (await buildLoyaltyPass({ ...base, safety: "options" }, config)).toString("utf8")
    expect(fallback).toContain('"label":"SIN TACC","value":"Con opciones sin TACC"')
  })

  it("puts the latest news on the back so the iPhone shows it as an alert", async () => {
    const text = (
      await buildLoyaltyPass(
        {
          serialNumber: "s4",
          barcodeValue: "s4",
          stamps: 2,
          stampsForReward: 5,
          reward: "Cookie",
          placeName: "Polvorin",
        },
        config
      )
    ).toString("utf8")
    expect(text).toContain('"changeMessage":"%@"')
    expect(text).toContain("¡Sumaste un sello en Polvorin! Te faltan 3 para tu premio: Cookie.")
  })

  it("writes a different news line for each card state", () => {
    const base = { total: 5, placeName: "Polvorín", reward: "Cookie" }
    expect(stampNewsMessage({ ...base, stamps: 0 })).toBe(
      "Mostrá esta tarjeta al pagar en Polvorín y sumá tu primer sello."
    )
    expect(stampNewsMessage({ ...base, stamps: 4 })).toBe(
      "¡Sumaste un sello en Polvorín! Te falta 1 para tu premio: Cookie."
    )
    expect(stampNewsMessage({ ...base, stamps: 5 })).toBe(
      "¡Completaste la tarjeta! Tu premio te espera en Polvorín: Cookie."
    )
    expect(stampNewsMessage({ ...base, stamps: 0, rewardsRedeemed: 2 })).toBe(
      "¡Canjeaste tu premio en Polvorín! Ya arrancás una tarjeta nueva."
    )
  })

  it("shows the card on the lock screen near the place", async () => {
    const base = {
      serialNumber: "s6",
      barcodeValue: "s6",
      stamps: 2,
      stampsForReward: 5,
      reward: "Cookie",
      placeName: "Polvorin",
    }
    const near = (
      await buildLoyaltyPass({ ...base, location: { latitude: -38.7183, longitude: -62.2663 } }, config)
    ).toString("utf8")
    expect(near).toContain(
      '"locations":[{"latitude":-38.7183,"longitude":-62.2663,"relevantText":"Estás cerca de Polvorin. Te faltan 3 sellos para tu premio."}]'
    )
    expect((await buildLoyaltyPass(base, config)).toString("utf8")).not.toContain('"locations"')
  })

  it("writes the nearby line for each card state", () => {
    const base = { total: 5, placeName: "Polvorín", reward: "Cookie" }
    expect(nearbyText({ ...base, stamps: 0 })).toBe("Estás cerca de Polvorín. Mostrá tu tarjeta al pagar y sumá un sello.")
    expect(nearbyText({ ...base, stamps: 4 })).toBe("Estás cerca de Polvorín. Te falta 1 sello para tu premio.")
    expect(nearbyText({ ...base, stamps: 5 })).toBe("Estás cerca de Polvorín y tu premio te espera: Cookie.")
  })

  it("adds the web service only over https", async () => {
    const base = {
      serialNumber: "s1",
      barcodeValue: "s1",
      stamps: 0,
      stampsForReward: 5,
      reward: "Un café",
      placeName: "Local",
    }
    const withHttps = (
      await buildLoyaltyPass(
        { ...base, webService: { url: "https://x.test/api/wallet/apple", authenticationToken: "t".repeat(32) } },
        config
      )
    ).toString("latin1")
    expect(withHttps).toContain('"webServiceURL":"https://x.test/api/wallet/apple"')
    const withHttp = (
      await buildLoyaltyPass(
        { ...base, webService: { url: "http://localhost:3000/api/wallet/apple", authenticationToken: "t".repeat(32) } },
        config
      )
    ).toString("latin1")
    expect(withHttp).not.toContain("webServiceURL")
  })
})
