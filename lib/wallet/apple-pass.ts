/**
 * Tarjeta de sellos de CeliMap para Apple Wallet (.pkpass).
 * Los certificados viven en variables de entorno del servidor; nunca en el repo.
 * Sin config completa, isApplePassConfigured() da false y la ruta responde 503.
 */

import { promises as fs } from "fs"
import path from "path"
import { PKPass } from "passkit-generator"
import { absoluteUrl } from "@/lib/base-url"

const ASSETS_DIR = path.join(process.cwd(), "public", "wallet", "apple")
const ASSET_FILES = [
  "icon.png",
  "icon@2x.png",
  "icon@3x.png",
  "logo.png",
  "logo@2x.png",
  "logo@3x.png",
] as const

// Oliva / crema de marca (app/globals.css).
const COLORS = {
  backgroundColor: "rgb(45, 74, 52)",
  foregroundColor: "rgb(247, 243, 235)",
  labelColor: "rgb(214, 205, 186)",
}

export type ApplePassConfig = {
  passTypeIdentifier: string
  teamIdentifier: string
  signerCert: string
  signerKey: string
  signerKeyPassphrase?: string
  wwdr: string
}

export type LoyaltyPassInput = {
  serialNumber: string
  /** Valor del QR que escanea el local para sumar sellos. */
  barcodeValue: string
  stamps: number
  stampsForReward: number
  reward: string
  placeName: string
  /** Ruta relativa de la ficha del local, ej. /lugar/slug. */
  placePath?: string
}

function normalizePem(raw: string): string {
  let pem = raw.trim()
  // .env con saltos de línea escapados como \n
  if (pem.includes("\\n")) pem = pem.replace(/\\n/g, "\n")
  return pem
}

export function getApplePassConfig(): ApplePassConfig | null {
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_ID?.trim()
  // El certificado de la tarjeta puede ser de otro equipo de Apple que el del
  // login (APPLE_TEAM_ID). teamIdentifier tiene que coincidir con el OU del
  // certificado; si no, el iPhone rechaza el .pkpass sin mostrar error.
  const teamIdentifier =
    process.env.APPLE_PASS_TEAM_ID?.trim() || process.env.APPLE_TEAM_ID?.trim()
  const signerCert = process.env.APPLE_PASS_CERT
  const signerKey = process.env.APPLE_PASS_KEY
  const wwdr = process.env.APPLE_WWDR_CERT
  if (!passTypeIdentifier || !teamIdentifier || !signerCert || !signerKey || !wwdr) {
    return null
  }
  const passphrase = process.env.APPLE_PASS_KEY_PASSPHRASE?.trim()
  return {
    passTypeIdentifier,
    teamIdentifier,
    signerCert: normalizePem(signerCert),
    signerKey: normalizePem(signerKey),
    signerKeyPassphrase: passphrase || undefined,
    wwdr: normalizePem(wwdr),
  }
}

export function isApplePassConfigured(): boolean {
  return getApplePassConfig() !== null
}

/** "●●○○○" — se lee bien en la tarjeta y en la pantalla bloqueada. */
export function formatStampDots(stamps: number, total: number): string {
  const filled = Math.max(0, Math.min(stamps, total))
  return "●".repeat(filled) + "○".repeat(Math.max(0, total - filled))
}

async function loadAssets(): Promise<Record<string, Buffer>> {
  const entries = await Promise.all(
    ASSET_FILES.map(async (name) => [name, await fs.readFile(path.join(ASSETS_DIR, name))] as const)
  )
  return Object.fromEntries(entries)
}

export async function buildLoyaltyPass(
  input: LoyaltyPassInput,
  config: ApplePassConfig
): Promise<Buffer> {
  const total = Math.max(1, Math.floor(input.stampsForReward))
  const stamps = Math.max(0, Math.min(Math.floor(input.stamps), total))
  const placeUrl = absoluteUrl(input.placePath ?? "/")

  const pass = new PKPass(
    await loadAssets(),
    {
      wwdr: config.wwdr,
      signerCert: config.signerCert,
      signerKey: config.signerKey,
      signerKeyPassphrase: config.signerKeyPassphrase,
    },
    {
      formatVersion: 1,
      serialNumber: input.serialNumber,
      passTypeIdentifier: config.passTypeIdentifier,
      teamIdentifier: config.teamIdentifier,
      organizationName: "CeliMap",
      description: `Tarjeta de sellos · ${input.placeName}`,
      logoText: "CeliMap",
      sharingProhibited: true,
      ...COLORS,
    }
  )

  pass.type = "storeCard"

  pass.headerFields.push({
    key: "count",
    label: "SELLOS",
    value: `${stamps}/${total}`,
  })
  pass.primaryFields.push({
    key: "stamps",
    label: input.placeName,
    value: formatStampDots(stamps, total),
  })
  pass.secondaryFields.push({
    key: "reward",
    label: "PREMIO",
    value: input.reward,
  })
  pass.backFields.push(
    {
      key: "how",
      label: "Cómo funciona",
      value: `Mostrá esta tarjeta al pagar y el local te suma un sello. Con ${total} sellos: ${input.reward}.`,
    },
    {
      key: "place",
      label: "Ver el local en CeliMap",
      value: placeUrl,
      attributedValue: `<a href="${placeUrl}">${placeUrl.replace(/^https?:\/\//, "")}</a>`,
    }
  )

  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: input.barcodeValue,
    messageEncoding: "iso-8859-1",
  })

  return pass.getAsBuffer()
}
