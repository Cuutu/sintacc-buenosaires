/**
 * Tarjeta de sellos de CeliMap para Apple Wallet (.pkpass).
 * Los certificados viven en variables de entorno del servidor; nunca en el repo.
 * Sin config completa, isApplePassConfigured() da false y la ruta responde 503.
 */

import { promises as fs } from "fs"
import path from "path"
import { PKPass } from "passkit-generator"
import { absoluteUrl } from "@/lib/base-url"
import { logger } from "@/lib/logger"
import type { ApplePassConfig } from "@/lib/wallet/config"
import { clampStamps, stampHowText, stampNewsMessage } from "@/lib/wallet/card-text"
import { CARD_SAFETY_LABEL, cardSafetyNote, cardTheme, type CardSafety } from "@/lib/wallet/card-safety"
import { appleStripBox, renderStampStrip } from "@/lib/wallet/stamp-strip"

const ASSETS_DIR = path.join(process.cwd(), "public", "wallet", "apple")
const ASSET_FILES = [
  "icon.png",
  "icon@2x.png",
  "icon@3x.png",
  "logo.png",
  "logo@2x.png",
  "logo@3x.png",
] as const

export { getApplePassConfig, isApplePassConfigured, type ApplePassConfig } from "@/lib/wallet/config"

/** Apple pide los colores como rgb(r, g, b). */
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

/** Fondo y etiquetas según el tema de la tarjeta; el texto, siempre crema. */
function passColors(safety: CardSafety | null) {
  const theme = cardTheme(safety)
  return {
    backgroundColor: rgb(theme.background),
    foregroundColor: rgb("#F7F3EB"),
    labelColor: rgb(theme.label),
  }
}

export type LoyaltyPassInput = {
  serialNumber: string
  /** Valor del QR que escanea el local para sumar sellos. */
  barcodeValue: string
  stamps: number
  stampsForReward: number
  reward: string
  placeName: string
  /** Premios ya canjeados: distingue una tarjeta nueva de una que se acaba de canjear. */
  rewardsRedeemed?: number
  /** Ruta relativa de la ficha del local, ej. /lugar/slug. */
  placePath?: string
  /** 100% sin TACC o con opciones; sin dato, la tarjeta no lleva etiqueta. */
  safety?: CardSafety | null
  /** Servicio web para que el Wallet se actualice solo (sólo https). */
  webService?: { url: string; authenticationToken: string }
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

/** strip.png @1x/@2x/@3x con los sellos; null si no se pudo dibujar (la tarjeta sale igual). */
async function loadStampStrip(
  stamps: number,
  total: number,
  safety: CardSafety | null
): Promise<Record<string, Buffer> | null> {
  try {
    const [x1, x2, x3] = await Promise.all([
      renderStampStrip(stamps, total, appleStripBox(1), safety),
      renderStampStrip(stamps, total, appleStripBox(2), safety),
      renderStampStrip(stamps, total, appleStripBox(3), safety),
    ])
    return { "strip.png": x1, "strip@2x.png": x2, "strip@3x.png": x3 }
  } catch (error) {
    logger.warn({
      route: "wallet-pass",
      message: "no se pudo dibujar la franja de sellos",
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export async function buildLoyaltyPass(
  input: LoyaltyPassInput,
  config: ApplePassConfig
): Promise<Buffer> {
  const { stamps, total } = clampStamps(input.stamps, input.stampsForReward)
  const placeUrl = absoluteUrl(input.placePath ?? "/")
  const safety = input.safety ?? null
  const [assets, strip] = await Promise.all([loadAssets(), loadStampStrip(stamps, total, safety)])

  const pass = new PKPass(
    { ...assets, ...strip },
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
      ...passColors(safety),
      ...(input.webService?.url.startsWith("https://")
        ? {
            webServiceURL: input.webService.url,
            authenticationToken: input.webService.authenticationToken,
          }
        : {}),
    }
  )

  pass.type = "storeCard"

  pass.headerFields.push({
    key: "count",
    label: "SELLOS",
    value: `${stamps}/${total}`,
  })
  // Con franja, los sellos y la etiqueta TACC se ven en la imagen; sin ella, van como texto.
  if (!strip) {
    pass.primaryFields.push({
      key: "stamps",
      label: "SELLOS",
      value: formatStampDots(stamps, total),
    })
    if (safety) {
      pass.auxiliaryFields.push({ key: "tacc", label: "SIN TACC", value: CARD_SAFETY_LABEL[safety] })
    }
  }
  pass.secondaryFields.push(
    {
      key: "placeName",
      label: "LOCAL",
      value: input.placeName,
    },
    {
      key: "reward",
      label: "PREMIO",
      value: input.reward,
      textAlignment: "PKTextAlignmentRight",
    }
  )
  pass.backFields.push(
    {
      key: "news",
      label: "Última novedad",
      value: stampNewsMessage({ ...input, stamps, total }),
      changeMessage: "%@",
    },
    {
      key: "how",
      label: "Cómo funciona",
      value: stampHowText(total, input.reward),
    },
    ...(safety ? [{ key: "taccNote", label: CARD_SAFETY_LABEL[safety], value: cardSafetyNote(safety) }] : []),
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
