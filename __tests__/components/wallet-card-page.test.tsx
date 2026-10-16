/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server"
import mongoose from "mongoose"

const mockUserAgent = jest.fn()
jest.mock("next/headers", () => ({ headers: () => ({ get: () => mockUserAgent() }) }))
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound")
  },
}))
const mockGetProgram = jest.fn()
const mockFindInviter = jest.fn()
jest.mock("@/lib/wallet/loyalty", () => ({
  getProgramWithPlace: (...a: unknown[]) => mockGetProgram(...a),
  findInviterCard: (...a: unknown[]) => mockFindInviter(...a),
}))
jest.mock("@/lib/wallet/config", () => ({
  isApplePassConfigured: () => true,
  isGoogleWalletConfigured: () => true,
}))
const mockBadges = jest.fn()
jest.mock("@/lib/wallet/badges", () => ({
  ...jest.requireActual("@/lib/wallet/badges"),
  walletBadges: (...a: unknown[]) => mockBadges(...a),
}))

import TarjetaPage from "@/app/tarjeta/[programaId]/page"

const programId = new mongoose.Types.ObjectId()
const APPLE_BADGE = { src: "/wallet/badges/agregar-a-apple-wallet.svg", width: 160, height: 48, alt: "Agregar a Apple Wallet" }

async function render(searchParams: Record<string, string> = {}) {
  return renderToStaticMarkup(await TarjetaPage({ params: { programaId: programId.toString() }, searchParams }))
}

describe("/tarjeta/[programaId]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUserAgent.mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")
    mockFindInviter.mockResolvedValue(null)
    mockBadges.mockReturnValue({ apple: null, google: null })
    mockGetProgram.mockResolvedValue({
      program: {
        _id: programId,
        active: true,
        stampsForReward: 10,
        reward: "Cookie",
        doubleStamp: { days: [1, 2], fromHour: 15, toHour: 18 },
      },
      placeName: "Polvorín",
      placePath: "/lugar/polvorin",
      safety: "dedicated",
    })
  })

  it("shows only the iPhone's Wallet, with the text button until the badge is uploaded", async () => {
    const html = await render()
    expect(mockBadges).toHaveBeenCalledWith({ apple: true, google: false })
    expect(html).toContain(`href="/api/wallet/tarjeta/${programId}/apple"`)
    expect(html).not.toContain("/google")
    expect(html).toContain("Agregar a Apple Wallet")
    expect(html).not.toContain("marcas de Apple")
    expect(html).toContain("Sello doble los lunes y martes de 15 a 18 h")
  })

  it("uses the official badge and its trademark line", async () => {
    mockBadges.mockReturnValue({ apple: APPLE_BADGE, google: null })
    const html = await render()
    expect(html).toContain('src="/wallet/badges/agregar-a-apple-wallet.svg"')
    expect(html).toContain("Apple y Apple Wallet son marcas de Apple Inc.")
  })

  it("welcomes invited friends and keeps the invite on the buttons", async () => {
    const amigo = new mongoose.Types.ObjectId()
    mockFindInviter.mockResolvedValue(amigo)
    mockUserAgent.mockReturnValue("Mozilla/5.0 (Windows NT 10.0)")
    const html = await render({ amigo: amigo.toString() })
    expect(mockFindInviter).toHaveBeenCalledWith(expect.objectContaining({ _id: programId }), amigo.toString())
    expect(html).toContain("Te invitó un amigo")
    expect(html).toContain(`href="/api/wallet/tarjeta/${programId}/apple?amigo=${amigo}"`)
    expect(html).toContain(`href="/api/wallet/tarjeta/${programId}/google?amigo=${amigo}"`)
  })

  it("ignores invite links that are not valid for this place", async () => {
    const html = await render({ amigo: "cualquier-cosa" })
    expect(html).not.toContain("Te invitó un amigo")
    expect(html).not.toContain("amigo=")
  })
})
