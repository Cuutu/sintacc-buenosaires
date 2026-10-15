/**
 * Franja de sellos de la tarjeta de Apple Wallet (strip.png de un storeCard).
 * Cada sello es el pin de CeliMap "estampado" sobre crema; el último casillero es el premio
 * (regalo terracota vacío, pin terracota al completar). Fondo oliva con textura de espigas.
 * Se dibuja con @vercel/og (ya en el repo) y se cachea en memoria por (sellos, total, escala).
 */

import { readFile } from "fs/promises"
import path from "path"
import { ImageResponse } from "@vercel/og"
import { stampGrid, stampTilt } from "@/lib/wallet/stamp-style"

/** Tamaño en puntos del strip de un storeCard. */
export const STRIP_WIDTH = 375
export const STRIP_HEIGHT = 144

const ASSETS_DIR = path.join(process.cwd(), "public", "wallet", "apple")
const FONT_PATH = path.join(process.cwd(), "assets", "fonts", "dm-sans-latin-700-normal.woff")
const TEXTURE_PATH = path.join(process.cwd(), "public", "brand", "texture-wheat.svg")

// Oliva / crema / terracota de marca (app/globals.css).
const CREAM = "#F7F3EB"
const TERRACOTTA = "#D4633A"
const BACKGROUND = "linear-gradient(180deg, #2D4A34 0%, #243D2B 100%)"
const TEXTURE = "rgba(247,243,235,0.07)"
// Rellenos opacos para que la textura de espigas no cruce los números.
const EMPTY_FILL = "#31503A"
const EMPTY_RING = "rgba(247,243,235,0.45)"
const EMPTY_TEXT = "rgba(247,243,235,0.5)"
const REWARD_FILL = "#404731"

export type StripLayout = { cols: number; rows: number; size: number; gap: number }

export function stripLayout(total: number, scale = 1): StripLayout {
  const { rows, cols } = stampGrid(total)
  const padX = 18 * scale
  const padY = 14 * scale
  const gap = (rows === 1 ? 12 : 8) * scale
  const byWidth = (STRIP_WIDTH * scale - 2 * padX - (cols - 1) * gap) / cols
  const byHeight = (STRIP_HEIGHT * scale - 2 * padY - (rows - 1) * gap) / rows
  return { cols, rows, size: Math.floor(Math.min(byWidth, byHeight, 64 * scale)), gap }
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
}: {
  index: number
  total: number
  filled: boolean
  size: number
  assets: Assets
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
          border: `${Math.max(2, Math.round(size * 0.05))}px solid ${isReward ? TERRACOTTA : CREAM}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen para @vercel/og, no para el navegador */}
        <img src={isReward ? assets.reward : assets.mark} width={pinWidth} height={pinHeight} alt="" />
      </div>
    )
  }

  const ring = isReward ? TERRACOTTA : EMPTY_RING
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size,
        border: `${Math.max(2, Math.round(size * 0.035))}px dashed ${ring}`,
        background: isReward ? REWARD_FILL : EMPTY_FILL,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: EMPTY_TEXT,
        fontSize: Math.round(size * 0.34),
        fontFamily: "DM Sans",
        fontWeight: 700,
      }}
    >
      {isReward ? <GiftIcon size={Math.round(size * 0.46)} color={TERRACOTTA} /> : String(index + 1)}
    </div>
  )
}

const cache = new Map<string, Buffer>()
const CACHE_MAX = 200

export async function renderStampStrip(stamps: number, total: number, scale: 1 | 2 | 3): Promise<Buffer> {
  const safeTotal = Math.max(1, Math.min(20, Math.floor(total)))
  const safeStamps = Math.max(0, Math.min(safeTotal, Math.floor(stamps)))
  const key = `${safeStamps}/${safeTotal}@${scale}`
  const hit = cache.get(key)
  if (hit) return hit

  const assets = await loadAssets()
  const { cols, rows, size, gap } = stripLayout(safeTotal, scale)
  const rowsOfSlots = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => r * cols + c).filter((i) => i < safeTotal)
  )

  const tile = 160 * scale
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
        backgroundColor: "#2D4A34",
        backgroundImage: `url(${textureUrl}), ${BACKGROUND}`,
        backgroundSize: `${tile}px ${tile}px, 100% 100%`,
        backgroundRepeat: "repeat, no-repeat",
      }}
    >
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
            />
          ))}
        </div>
      ))}
    </div>
  )

  const response = new ImageResponse(element, {
    width: STRIP_WIDTH * scale,
    height: STRIP_HEIGHT * scale,
    fonts: [{ name: "DM Sans", data: assets.font, weight: 700, style: "normal" }],
  })
  const png = Buffer.from(await response.arrayBuffer())
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
  cache.set(key, png)
  return png
}
