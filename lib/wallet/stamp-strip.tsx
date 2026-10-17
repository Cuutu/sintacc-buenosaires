/**
 * Franja de sellos de la tarjeta de Apple Wallet (strip.png de un storeCard).
 * Cada sello es el pin de CeliMap "estampado" sobre crema; el último casillero es el premio
 * (regalo terracota vacío, pin terracota al completar). Fondo oliva con textura de espigas
 * y, si el lugar lo tiene en el mapa, la etiqueta "100% sin TACC" o "Con opciones sin TACC".
 * También es la imagen principal de la tarjeta de Google Wallet.
 * Se dibuja con @vercel/og (ya en el repo) y se cachea en memoria por (sellos, total, etiqueta, tamaño).
 */

import { readFile } from "fs/promises"
import path from "path"
import { ImageResponse } from "@vercel/og"
import { stampGrid, stampTilt } from "@/lib/wallet/stamp-style"
import {
  CARD_SAFETY_LABEL,
  cardSafetyPill,
  cardTheme,
  type CardSafety,
  type CardTheme,
} from "@/lib/wallet/card-safety"

/** Tamaño en puntos del strip de un storeCard de Apple. */
export const STRIP_WIDTH = 375
export const STRIP_HEIGHT = 144

export type StripBox = { width: number; height: number }

/** strip.png / @2x / @3x de Apple Wallet. */
export function appleStripBox(scale: 1 | 2 | 3): StripBox {
  return { width: STRIP_WIDTH * scale, height: STRIP_HEIGHT * scale }
}

/** Imagen principal (heroImage) de Google Wallet: 1032×336 recomendado. */
export const GOOGLE_HERO_BOX: StripBox = { width: 1032, height: 336 }

const ASSETS_DIR = path.join(process.cwd(), "public", "wallet", "apple")
const FONT_PATH = path.join(process.cwd(), "assets", "fonts", "dm-sans-latin-700-normal.woff")
const TEXTURE_PATH = path.join(process.cwd(), "public", "brand", "texture-wheat.svg")

// Crema de marca (app/globals.css); el resto de los colores sale del tema de la tarjeta.
const CREAM = "#F7F3EB"
const TEXTURE = "rgba(247,243,235,0.07)"
const EMPTY_RING = "rgba(247,243,235,0.45)"
const EMPTY_TEXT = "rgba(247,243,235,0.5)"

export type StripLayout = { cols: number; rows: number; size: number; gap: number }

/** Alto de la etiqueta TACC más su separación con los sellos, en puntos del strip. */
const LABEL_SPACE = 24

export function stripLayout(total: number, box: StripBox, labeled = false): StripLayout {
  const { rows, cols } = stampGrid(total)
  // Medidas pensadas en puntos del strip de Apple; se escalan según el alto.
  const unit = box.height / STRIP_HEIGHT
  const padX = 18 * unit
  const padY = (labeled ? 10 : 14) * unit
  const top = labeled ? LABEL_SPACE * unit : 0
  const gap = Math.round((rows === 1 ? 12 : 8) * unit)
  const byWidth = (box.width - 2 * padX - (cols - 1) * gap) / cols
  const byHeight = (box.height - 2 * padY - top - (rows - 1) * gap) / rows
  return { cols, rows, size: Math.floor(Math.min(byWidth, byHeight, 64 * unit)), gap }
}

type Assets = { mark: string; reward: string; font: Buffer; texture: string }
let assetsPromise: Promise<Assets> | null = null

function loadAssets(): Promise<Assets> {
  assetsPromise ??= Promise.all([
    readFile(path.join(ASSETS_DIR, "stamp-mark.png")),
    readFile(path.join(ASSETS_DIR, "stamp-reward.png")),
    readFile(FONT_PATH),
    readFile(TEXTURE_PATH, "utf8"),
  ]).then(([mark, reward, font, texture]) => ({
    mark: `data:image/png;base64,${mark.toString("base64")}`,
    reward: `data:image/png;base64,${reward.toString("base64")}`,
    font,
    texture,
  }))
  return assetsPromise
}

function GiftIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  )
}

function Slot({
  index,
  total,
  filled,
  size,
  assets,
  theme,
}: {
  index: number
  total: number
  filled: boolean
  size: number
  assets: Assets
  theme: CardTheme
}) {
  const isReward = index === total - 1
  const tilt = stampTilt(index)
  const pinHeight = Math.round(size * 0.62)
  const pinWidth = Math.round(pinHeight * 0.75)

  if (filled) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size,
          background: CREAM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `rotate(${tilt}deg)`,
          boxShadow: `0 ${Math.round(size * 0.04)}px ${Math.round(size * 0.1)}px rgba(0,0,0,0.25)`,
          border: `${Math.max(2, Math.round(size * 0.05))}px solid ${isReward ? theme.rewardBorder : CREAM}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen para @vercel/og, no para el navegador */}
        <img src={isReward ? assets.reward : assets.mark} width={pinWidth} height={pinHeight} alt="" />
      </div>
    )
  }

  const ring = isReward ? theme.accent : EMPTY_RING
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        border: `${Math.max(2, Math.round(size * 0.035))}px dashed ${ring}`,
        background: isReward ? theme.rewardFill : theme.emptyFill,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: EMPTY_TEXT,
        fontSize: Math.round(size * 0.34),
        fontFamily: "DM Sans",
        fontWeight: 700,
      }}
    >
      {isReward ? <GiftIcon size={Math.round(size * 0.46)} color={theme.accent} /> : String(index + 1)}
    </div>
  )
}

function SafetyPill({ safety, unit, assets }: { safety: CardSafety; unit: number; assets: Assets }) {
  const pill = cardSafetyPill(safety)
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: Math.round(5 * unit),
        height: Math.round(18 * unit),
        padding: `0 ${Math.round(9 * unit)}px`,
        borderRadius: 999,
        background: pill.background,
        color: pill.text,
        fontFamily: "DM Sans",
        fontWeight: 700,
        fontSize: Math.round(9.5 * unit),
        letterSpacing: Math.round(0.8 * unit),
        marginBottom: Math.round(2 * unit),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- imagen para @vercel/og, no para el navegador */}
      <img
        src={pill.pin === "mark" ? assets.mark : assets.reward}
        width={Math.round(9 * unit)}
        height={Math.round(12 * unit)}
        alt=""
      />
      {CARD_SAFETY_LABEL[safety].toUpperCase()}
    </div>
  )
}

const cache = new Map<string, Buffer>()
const CACHE_MAX = 200

export async function renderStampStrip(
  stamps: number,
  total: number,
  box: StripBox,
  safety: CardSafety | null = null
): Promise<Buffer> {
  const safeTotal = Math.max(1, Math.min(20, Math.floor(total)))
  const safeStamps = Math.max(0, Math.min(safeTotal, Math.floor(stamps)))
  const key = `${safeStamps}/${safeTotal}/${safety ?? "-"}@${box.width}x${box.height}`
  const hit = cache.get(key)
  if (hit) return hit

  const assets = await loadAssets()
  const theme = cardTheme(safety)
  const { cols, rows, size, gap } = stripLayout(safeTotal, box, safety !== null)
  const rowsOfSlots = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => r * cols + c).filter((i) => i < safeTotal)
  )

  const tile = Math.round((160 * box.height) / STRIP_HEIGHT)
  const textureUrl = `data:image/svg+xml;base64,${Buffer.from(
    assets.texture.replace(/currentColor/g, TEXTURE)
  ).toString("base64")}`

  const element = (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap,
        backgroundColor: theme.background,
        backgroundImage: `url(${textureUrl}), linear-gradient(180deg, ${theme.background} 0%, ${theme.backgroundEnd} 100%)`,
        backgroundSize: `${tile}px ${tile}px, 100% 100%`,
        backgroundRepeat: "repeat, no-repeat",
      }}
    >
      {safety && <SafetyPill safety={safety} unit={box.height / STRIP_HEIGHT} assets={assets} />}
      {rowsOfSlots.map((row, r) => (
        <div key={r} style={{ display: "flex", gap }}>
          {row.map((i) => (
            <Slot
              key={i}
              index={i}
              total={safeTotal}
              filled={i < safeStamps}
              size={size}
              assets={assets}
              theme={theme}
            />
          ))}
        </div>
      ))}
    </div>
  )

  const response = new ImageResponse(element, {
    width: box.width,
    height: box.height,
    fonts: [{ name: "DM Sans", data: assets.font, weight: 700, style: "normal" }],
  })
  const png = Buffer.from(await response.arrayBuffer())
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
  cache.set(key, png)
  return png
}
