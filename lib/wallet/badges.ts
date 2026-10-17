/**
 * Insignias oficiales "Agregar a Apple Wallet" y "Agregar a Google Wallet".
 * Apple y Google piden usar sus archivos tal cual (sin redibujarlos ni cambiarles el texto),
 * así que no viven en el código: se descargan de cada marca y se dejan en public/wallet/badges/
 * con estos nombres. Mientras falte un archivo, se usa el botón de texto de antes.
 * Sólo servidor (lee el disco).
 */

import { readFileSync } from "fs"
import path from "path"
import type { LoyaltyWallet } from "@/models/LoyaltyCard"
import { BADGE_ALT } from "@/lib/wallet/badge-text"

export { BADGE_ALT, BADGE_TRADEMARK } from "@/lib/wallet/badge-text"

export const BADGE_DIR = path.join("public", "wallet", "badges")

export const BADGE_FILES: Record<LoyaltyWallet, string> = {
  apple: "agregar-a-apple-wallet.svg",
  google: "agregar-a-google-wallet.svg",
}

export type WalletBadge = { src: string; width: number; height: number; alt: string }

/** Proporción del SVG: primero el viewBox, si no width/height. */
export function svgSize(svg: string): { width: number; height: number } | null {
  const root = svg.match(/<svg\b[^>]*>/i)?.[0]
  if (!root) return null
  const viewBox = root.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1]
  if (viewBox) {
    const [, , width, height] = viewBox.trim().split(/[\s,]+/).map(Number)
    if (width > 0 && height > 0) return { width, height }
  }
  const width = parseFloat(root.match(/\swidth\s*=\s*["']([\d.]+)/i)?.[1] ?? "")
  const height = parseFloat(root.match(/\sheight\s*=\s*["']([\d.]+)/i)?.[1] ?? "")
  return width > 0 && height > 0 ? { width, height } : null
}

const cache = new Map<LoyaltyWallet, WalletBadge | null>()

/** La insignia del Wallet, o null si todavía no se subió el archivo (o no es un SVG válido). */
export function walletBadge(wallet: LoyaltyWallet, root = process.cwd()): WalletBadge | null {
  if (cache.has(wallet)) return cache.get(wallet) ?? null
  let badge: WalletBadge | null = null
  try {
    const size = svgSize(readFileSync(path.join(root, BADGE_DIR, BADGE_FILES[wallet]), "utf8"))
    if (size) badge = { src: `/wallet/badges/${BADGE_FILES[wallet]}`, ...size, alt: BADGE_ALT[wallet] }
  } catch {
    badge = null
  }
  // Sólo se recuerda si está: así, al subir el archivo aparece sin reiniciar.
  if (badge) cache.set(wallet, badge)
  return badge
}

export function walletBadges(wallets: { apple: boolean; google: boolean }): {
  apple: WalletBadge | null
  google: WalletBadge | null
} {
  return {
    apple: wallets.apple ? walletBadge("apple") : null,
    google: wallets.google ? walletBadge("google") : null,
  }
}

/** Para tests. */
export function clearBadgeCache(): void {
  cache.clear()
}
