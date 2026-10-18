/**
 * Avisa a los iPhones que una tarjeta cambió (APNs con el certificado del pase).
 * El push va vacío: el Wallet después pide la tarjeta nueva al servicio web.
 * Es best-effort: si falla, la tarjeta se actualiza la próxima vez que el iPhone consulte.
 */

import http2 from "http2"
import connectDB from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { LoyaltyDevice } from "@/models/LoyaltyDevice"
import type { ApplePassConfig } from "@/lib/wallet/config"

const APNS_ORIGIN = "https://api.push.apple.com"
const PUSH_TIMEOUT_MS = 5_000

function sendOne(client: http2.ClientHttp2Session, pushToken: string, topic: string): Promise<number> {
  return new Promise((resolve) => {
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${encodeURIComponent(pushToken)}`,
      "apns-topic": topic,
      "content-type": "application/json",
    })
    req.setTimeout(PUSH_TIMEOUT_MS, () => {
      req.close()
      resolve(0)
    })
    req.on("response", (headers) => resolve(Number(headers[":status"]) || 0))
    req.on("error", () => resolve(0))
    req.end("{}")
  })
}

/** Avisos en paralelo, de a tandas, por la misma conexión. */
const BATCH_SIZE = 100

export async function notifyPassUpdated(serialNumber: string, config: ApplePassConfig): Promise<void> {
  await notifyPassesUpdated([serialNumber], config)
}

/** Avisa a todos los iPhones que tienen alguna de estas tarjetas (por ejemplo, después de un aviso del local). */
export async function notifyPassesUpdated(serialNumbers: string[], config: ApplePassConfig): Promise<void> {
  if (serialNumbers.length === 0) return
  await connectDB()
  const devices = await LoyaltyDevice.find({ serialNumber: { $in: serialNumbers } }).select("pushToken").lean()
  if (devices.length === 0) return

  let client: http2.ClientHttp2Session | null = null
  try {
    client = http2.connect(APNS_ORIGIN, {
      cert: config.signerCert,
      key: config.signerKey,
      passphrase: config.signerKeyPassphrase,
    })
    client.on("error", () => undefined)
    const tokens = Array.from(new Set(devices.map((d) => d.pushToken)))
    const statuses: number[] = []
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE)
      statuses.push(
        ...(await Promise.all(
          batch.map((token) => sendOne(client as http2.ClientHttp2Session, token, config.passTypeIdentifier))
        ))
      )
    }
    // 410: el iPhone ya no tiene la tarjeta.
    const gone = tokens.filter((_, i) => statuses[i] === 410)
    if (gone.length > 0) await LoyaltyDevice.deleteMany({ pushToken: { $in: gone } })
    const failed = statuses.filter((s) => s !== 200 && s !== 410).length
    if (failed > 0) logger.warn({ route: "wallet-push", message: "algunos avisos fallaron", failed })
  } catch (error) {
    logger.warn({
      route: "wallet-push",
      message: "no se pudo avisar al Wallet",
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    client?.close()
  }
}
