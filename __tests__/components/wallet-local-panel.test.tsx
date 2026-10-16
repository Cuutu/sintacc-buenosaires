/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server"
import mongoose from "mongoose"

const mockSession = jest.fn()
jest.mock("next-auth", () => ({ getServerSession: () => mockSession() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`)
  },
}))
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
const programId = new mongoose.Types.ObjectId()
const placeId = new mongoose.Types.ObjectId()
const mockPrograms = jest.fn()
jest.mock("@/models/LoyaltyProgram", () => ({
  LoyaltyProgram: { find: (...a: unknown[]) => ({ lean: () => mockPrograms(...a) }) },
}))
jest.mock("@/models/Place", () => ({
  Place: {
    find: () => ({ select: () => ({ lean: async () => [{ _id: placeId, name: "Polvorín", slug: "polvorin" }] }) }),
  },
}))
jest.mock("@/lib/wallet/loyalty", () => ({
  ...jest.requireActual("@/lib/wallet/loyalty"),
  getProgramStats: async () => ({ cards: 10, customers: 5, cardsWithSecondStamp: 4, stampsLast7Days: 6, redeems: 1, invitedCards: 2 }),
}))
jest.mock("@/lib/wallet/visits", () => ({
  getDailyVisits: async () => ({
    total: 5,
    days: ["Sáb", "Dom", "Lun", "Mar", "Mié", "Jue", "Vie"].map((label, i) => ({
      date: `2026-10-1${i}`,
      label,
      visits: i,
      today: i === 6,
    })),
  }),
}))

import LocalPage from "@/app/local/page"

describe("/local", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPrograms.mockResolvedValue([
      { _id: programId, placeId, stampsForReward: 10, reward: "Cookie", staffEmails: ["caja@polvorin.com"], active: true, referralEnabled: true },
    ])
  })

  it("asks to log in", async () => {
    mockSession.mockResolvedValue(null)
    await expect(LocalPage()).rejects.toThrow("redirect:/login?callbackUrl=/local")
  })

  it("shows only the shop's own programs", async () => {
    mockSession.mockResolvedValue({ user: { email: "Caja@Polvorin.com", role: "user" } })
    await LocalPage()
    expect(mockPrograms).toHaveBeenCalledWith({ staffEmails: "caja@polvorin.com" })
  })

  it("shows stats, the week chart, the tools and the share link", async () => {
    mockSession.mockResolvedValue({ user: { email: "caja@polvorin.com", role: "user" } })
    const html = renderToStaticMarkup(await LocalPage())
    expect(html).toContain("Polvorín")
    expect(html).toContain("Activa")
    // Volvieron sobre los clientes que vinieron (4 de 5), no sobre las tarjetas creadas.
    expect(html).toContain("80%")
    expect(html).toContain("10 tarjetas creadas")
    expect(html).toContain("Clientes que sumaron sellos")
    expect(html).toContain("5</strong> clientes en 7 días")
    expect(html).toContain("Hoy")
    expect(html).toContain("Mandá un aviso a tus clientes")
    expect(html).toContain("Sello doble")
    expect(html).toContain("Imprimir cartel con QR")
    expect(html).toContain(`/tarjeta/${programId}`)
    expect(html).toContain('href="/lugar/polvorin"')
  })
})
