/**
 * Tarjeta de sellos en Google Wallet (Android).
 * Una clase por programa (local) y un objeto por tarjeta de cliente. Se crean y actualizan
 * con la REST API; el cliente la guarda con un link firmado (JWT) a pay.google.com.
 * La clave de la cuenta de servicio vive en el env del servidor; nunca en el repo.
 */

import { SignJWT, importPKCS8, type KeyLike } from "jose"
import { absoluteUrl } from "@/lib/base-url"
import { logger } from "@/lib/logger"
import { clampStamps, stampHowText, stampNewsMessage } from "@/lib/wallet/card-text"
import { CARD_SAFETY_LABEL, cardSafetyNote, cardTheme } from "@/lib/wallet/card-safety"
import { googleHeroUrl, googleLogoUrl } from "@/lib/wallet/wallet-images"
import type { LoyaltyPassInput } from "@/lib/wallet/apple-pass"
import type { GoogleWalletConfig } from "@/lib/wallet/config"

export { getGoogleWalletConfig, isGoogleWalletConfigured, type GoogleWalletConfig } from "@/lib/wallet/config"

const API = "https://walletobjects.googleapis.com/walletobjects/v1"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer"
const SAVE_URL = "https://pay.google.com/gp/v/save/"
const LANGUAGE = "es-419"

/** Datos de la tarjeta (los mismos que la de Apple) más el programa, que define la clase. */
export type GoogleCardInput = LoyaltyPassInput & { programId: string }

export function googleClassId(config: GoogleWalletConfig, programId: string): string {
  return `${config.issuerId}.celimap_programa_${programId}`
}

export function googleObjectId(config: GoogleWalletConfig, serialNumber: string): string {
  return `${config.issuerId}.celimap_tarjeta_${serialNumber}`
}

const keys = new Map<string, Promise<KeyLike>>()

function signingKey(config: GoogleWalletConfig): Promise<KeyLike> {
  let key = keys.get(config.privateKey)
  if (!key) {
    key = importPKCS8(config.privateKey, "RS256")
    keys.set(config.privateKey, key)
  }
  return key
}

let token: { value: string; email: string; expiresAt: number } | null = null

async function accessToken(config: GoogleWalletConfig): Promise<string> {
  if (token && token.email === config.serviceAccountEmail && token.expiresAt > Date.now() + 60_000) {
    return token.value
  }
  const now = Math.floor(Date.now() / 1000)
  const assertion = await new SignJWT({ scope: SCOPE })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(config.serviceAccountEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await signingKey(config))
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`Google no dio acceso a la Wallet API (${res.status})`)
  const json = (await res.json()) as { access_token: string; expires_in: number }
  token = {
    value: json.access_token,
    email: config.serviceAccountEmail,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
  return token.value
}

async function walletApi(
  config: GoogleWalletConfig,
  method: "POST" | "PATCH",
  path: string,
  body: unknown
): Promise<Response> {
  return fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken(config)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })
}

async function expectOk(res: Response, what: string): Promise<void> {
  if (res.ok) return
  const detail = (await res.text().catch(() => "")).slice(0, 300)
  throw new Error(`${what}: ${res.status} ${detail}`)
}

/** Inserta; si ya existe, lo actualiza. */
async function upsert(
  config: GoogleWalletConfig,
  kind: "loyaltyClass" | "loyaltyObject",
  resource: { id: string }
): Promise<void> {
  const inserted = await walletApi(config, "POST", `/${kind}`, resource)
  if (inserted.status !== 409) return expectOk(inserted, `${kind} insert`)
  const patched = await walletApi(config, "PATCH", `/${kind}/${encodeURIComponent(resource.id)}`, resource)
  await expectOk(patched, `${kind} patch`)
}

const localized = (value: string) => ({ defaultValue: { language: LANGUAGE, value } })
const image = (uri: string, description: string) => ({
  sourceUri: { uri },
  contentDescription: localized(description),
})

export function buildLoyaltyClass(
  config: GoogleWalletConfig,
  input: Pick<GoogleCardInput, "programId" | "placeName" | "safety">,
  logoUrl: string
) {
  return {
    id: googleClassId(config, input.programId),
    issuerName: "CeliMap",
    programName: input.placeName,
    programLogo: image(logoUrl, "CeliMap"),
    // El mismo fondo que la tarjeta de Apple.
    hexBackgroundColor: cardTheme(input.safety ?? null).background,
    countryCode: "AR",
    // En modo demo se aprueba al toque; con acceso de publicación, Google la revisa.
    reviewStatus: "UNDER_REVIEW",
    multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
  }
}

export function buildLoyaltyObject(
  config: GoogleWalletConfig,
  input: GoogleCardInput,
  heroUrl: string | null
) {
  const { stamps, total } = clampStamps(input.stamps, input.stampsForReward)
  const placeUrl = absoluteUrl(input.placePath ?? "/")
  return {
    id: googleObjectId(config, input.serialNumber),
    classId: googleClassId(config, input.programId),
    state: "ACTIVE",
    loyaltyPoints: { label: "Sellos", balance: { string: `${stamps}/${total}` } },
    secondaryLoyaltyPoints: { label: "Premio", balance: { string: input.reward } },
    barcode: { type: "QR_CODE", value: input.barcodeValue },
    ...(heroUrl ? { heroImage: image(heroUrl, `${stamps} de ${total} sellos`) } : {}),
    textModulesData: [
      { id: "how", header: "Cómo funciona", body: stampHowText(total, input.reward) },
      ...(input.safety
        ? [{ id: "tacc", header: CARD_SAFETY_LABEL[input.safety], body: cardSafetyNote(input.safety) }]
        : []),
    ],
    linksModuleData: {
      uris: [{ id: "place", uri: placeUrl, description: "Ver el local en CeliMap" }],
    },
  }
}

async function buildResources(config: GoogleWalletConfig, input: GoogleCardInput) {
  const { stamps, total } = clampStamps(input.stamps, input.stampsForReward)
  const [logoUrl, heroUrl] = await Promise.all([
    googleLogoUrl(),
    googleHeroUrl(stamps, total, input.safety ?? null),
  ])
  return {
    loyaltyClass: buildLoyaltyClass(config, input, logoUrl),
    loyaltyObject: buildLoyaltyObject(config, input, heroUrl),
  }
}

/** Crea o actualiza la clase y la tarjeta, y devuelve el link para guardarla en Google Wallet. */
export async function googleSaveLink(input: GoogleCardInput, config: GoogleWalletConfig): Promise<string> {
  const { loyaltyClass, loyaltyObject } = await buildResources(config, input)
  await upsert(config, "loyaltyClass", loyaltyClass)
  await upsert(config, "loyaltyObject", loyaltyObject)

  // La tarjeta ya existe en Google: el link sólo la referencia (queda corto).
  const jwt = await new SignJWT({
    typ: "savetowallet",
    origins: [new URL(absoluteUrl("/")).origin],
    payload: { loyaltyObjects: [{ id: loyaltyObject.id, classId: loyaltyObject.classId }] },
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(config.serviceAccountEmail)
    .setAudience("google")
    .setIssuedAt()
    .sign(await signingKey(config))
  return `${SAVE_URL}${jwt}`
}

/**
 * Actualiza la tarjeta y le manda el aviso al celular ("¡Sumaste un sello…").
 * Best-effort, como el aviso de Apple: si falla, el sello ya quedó guardado.
 * Google permite hasta 3 avisos por tarjeta cada 24 h.
 */
export async function pushGoogleCardUpdate(input: GoogleCardInput, config: GoogleWalletConfig): Promise<void> {
  try {
    const { loyaltyObject } = await buildResources(config, input)
    const path = `/loyaltyObject/${encodeURIComponent(loyaltyObject.id)}`
    // Se borran los mensajes viejos: Google admite 10 por tarjeta y sólo importa el último.
    const patched = await walletApi(config, "PATCH", path, { ...loyaltyObject, messages: [] })
    if (patched.status === 404) return
    await expectOk(patched, "loyaltyObject patch")

    const { stamps, total } = clampStamps(input.stamps, input.stampsForReward)
    const added = await walletApi(config, "POST", `${path}/addMessage`, {
      message: {
        id: `novedad_${Date.now()}`,
        header: input.placeName,
        body: stampNewsMessage({ ...input, stamps, total }),
        messageType: "TEXT_AND_NOTIFY",
      },
    })
    await expectOk(added, "addMessage")
  } catch (error) {
    logger.warn({
      route: "wallet-google",
      message: "no se pudo actualizar la tarjeta de Google Wallet",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
