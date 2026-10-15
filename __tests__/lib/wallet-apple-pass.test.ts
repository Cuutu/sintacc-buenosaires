/**
 * @jest-environment node
 */
import {
  buildLoyaltyPass,
  formatStampDots,
  getApplePassConfig,
  type ApplePassConfig,
} from "@/lib/wallet/apple-pass"

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
})
