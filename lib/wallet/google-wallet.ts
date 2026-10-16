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
import { NOTICE_TTL_MS } from "@/lib/wallet/notice"
import { REFERRAL_TEXT } from "@/lib/wallet/promos"
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
  input: Pick<GoogleCardInput, "programId" | "placeName" | "safety" | "location">,
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
    // Cerca del local, Android avisa en la pantalla bloqueada (el radio y el texto los pone Google).
    ...(input.location ? { merchantLocations: [input.location] } : {}),
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
      ...(input.doubleStamp ? [{ id: "double", header: "Sello doble", body: input.doubleStamp }] : []),
      ...(input.inviteUrl ? [{ id: "invite", header: "Traé un amigo", body: REFERRAL_TEXT }] : []),
      ...(input.safety
        ? [{ id: "tacc", header: CARD_SAFETY_LABEL[input.safety], body: cardSafetyNote(input.safety) }]
        : []),
    ],
    linksModuleData: {
      uris: [
        ...(input.inviteUrl
          ? [{ id: "invite", uri: input.inviteUrl, description: "Traé un amigo: link para compartir" }]
          : []),
        { id: "place", uri: placeUrl, description: "Ver el local en CeliMap" },
      ],
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

/**
 * Actualiza la tarjeta sin mandarle aviso al celu (por ej., el local cambió una promo).
 * Devuelve false si falló o si la tarjeta todavía no existe en Google.
 */
export async function refreshGoogleCard(input: GoogleCardInput, config: GoogleWalletConfig): Promise<boolean> {
  try {
    const { loyaltyObject } = await buildResources(config, input)
    const patched = await walletApi(
      config,
      "PATCH",
      `/loyaltyObject/${encodeURIComponent(loyaltyObject.id)}`,
      loyaltyObject
    )
    if (patched.status === 404) return false
    await expectOk(patched, "loyaltyObject patch")
    return true
  } catch (error) {
    logger.warn({
      route: "wallet-google",
      message: "no se pudo actualizar la tarjeta de Google Wallet",
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

/**
 * El local dejó de tener tarjeta: las de Google pasan a "vencidas" (el celu las mueve a
 * tarjetas anteriores) para que nadie siga mostrando una tarjeta que ya no suma.
 * Best-effort, de a 5. Devuelve cuántas se marcaron.
 */
export async function expireGoogleCards(serials: string[], config: GoogleWalletConfig): Promise<number> {
  let expired = 0
  for (let i = 0; i < serials.length; i += 5) {
    const results = await Promise.all(
      serials.slice(i, i + 5).map(async (serial) => {
        try {
          const res = await walletApi(
            config,
            "PATCH",
            `/loyaltyObject/${encodeURIComponent(googleObjectId(config, serial))}`,
            { state: "EXPIRED" }
          )
          return res.ok
        } catch {
          return false
        }
      })
    )
    expired += results.filter(Boolean).length
  }
  if (expired < serials.length) {
    logger.warn({
      route: "wallet-google",
      message: `no se pudieron vencer ${serials.length - expired} tarjetas de Google Wallet`,
    })
  }
  return expired
}

/** Fecha como la pide Google (ISO 8601 sin milisegundos). */
const googleDate = (date: Date) => ({ date: date.toISOString().replace(/\.\d{3}Z$/, "Z") })

/**
 * Aviso del local a todos sus clientes de Android: un mensaje en la clase llega a todas las
 * tarjetas del local. Se borra el aviso anterior y el nuevo deja de verse a la semana.
 * Devuelve false si falló o si nadie guardó todavía la tarjeta en Google.
 */
export async function pushGoogleProgramNotice(
  input: Pick<GoogleCardInput, "programId" | "placeName" | "safety" | "location">,
  text: string,
  config: GoogleWalletConfig,
  now = new Date()
): Promise<boolean> {
  try {
    const loyaltyClass = buildLoyaltyClass(config, input, await googleLogoUrl())
    const path = `/loyaltyClass/${encodeURIComponent(loyaltyClass.id)}`
    const patched = await walletApi(config, "PATCH", path, { ...loyaltyClass, messages: [] })
    if (patched.status === 404) return false
    await expectOk(patched, "loyaltyClass patch")

    const added = await walletApi(config, "POST", `${path}/addMessage`, {
      message: {
        id: `aviso_${now.getTime()}`,
        header: `Aviso de ${input.placeName}`,
        body: text,
        messageType: "TEXT_AND_NOTIFY",
        displayInterval: { start: googleDate(now), end: googleDate(new Date(now.getTime() + NOTICE_TTL_MS)) },
      },
    })
    await expectOk(added, "class addMessage")
    return true
  } catch (error) {
    logger.warn({
      route: "wallet-google",
      message: "no se pudo mandar el aviso a Google Wallet",
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}
