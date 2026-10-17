/**
 * @jest-environment node
 */
import { mkdtempSync, mkdirSync, writeFileSync } from "fs"
import os from "os"
import path from "path"
import { BADGE_DIR, BADGE_FILES, clearBadgeCache, svgSize, walletBadge } from "@/lib/wallet/badges"

describe("wallet badges", () => {
  beforeEach(() => clearBadgeCache())

  it("reads the badge proportions from the SVG", () => {
    expect(svgSize('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 199 48">')).toEqual({ width: 199, height: 48 })
    expect(svgSize('<svg width="120.5px" height="40px">')).toEqual({ width: 120.5, height: 40 })
    expect(svgSize("<svg>")).toBeNull()
    expect(svgSize("no es un svg")).toBeNull()
  })

  it("falls back to the text button until the official file is uploaded", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "badges-"))
    expect(walletBadge("google", root)).toBeNull()

    mkdirSync(path.join(root, BADGE_DIR), { recursive: true })
    writeFileSync(path.join(root, BADGE_DIR, BADGE_FILES.google), '<svg viewBox="0 0 260 56"></svg>')
    expect(walletBadge("google", root)).toEqual({
      src: "/wallet/badges/agregar-a-google-wallet.svg",
      width: 260,
      height: 56,
      alt: "Agregar a Google Wallet",
    })
    expect(walletBadge("apple", root)).toBeNull()
  })
})
