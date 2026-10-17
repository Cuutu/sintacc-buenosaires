/**
 * Credenciales de los Wallets, leídas del env del servidor (nunca en el repo ni en NEXT_PUBLIC_*).
 * Sin config completa, cada Wallet queda apagado: su botón no aparece y su ruta responde 503.
 */

export type ApplePassConfig = {
  passTypeIdentifier: string
  teamIdentifier: string
  signerCert: string
  signerKey: string
  signerKeyPassphrase?: string
  wwdr: string
}

export type GoogleWalletConfig = {
  issuerId: string
  serviceAccountEmail: string
  privateKey: string
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

export function getGoogleWalletConfig(): GoogleWalletConfig | null {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID?.trim()
  const serviceAccountEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL?.trim()
  const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY
  if (!issuerId || !serviceAccountEmail || !privateKey?.trim()) return null
  // Copiada del JSON de la cuenta de servicio, viene con \n escapados.
  return { issuerId, serviceAccountEmail, privateKey: normalizePem(privateKey) }
}

export function isGoogleWalletConfigured(): boolean {
  return getGoogleWalletConfig() !== null
}
