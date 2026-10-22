/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server"
import mongoose from "mongoose"

const mockSession = jest.fn()
jest.mock("next-auth", () => ({ getServerSession: () => mockSession() }))
jest.mock("@/lib/auth", () => ({ authOptions: {} }))
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`)
  },
}))
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
const programId = new mongoose.Types.ObjectId()
const placeId = new mongoose.Types.ObjectId()
const mockPrograms = jest.fn()
const mockStats = jest.fn()
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
  getProgramStats: async () => mockStats(),
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

jest.mock("@/lib/wallet/monthly", () => ({
  getMonthlyStamps: async (ids: Array<{ toString(): string }>) =>
    new Map(
      ids.map((id) => [
        id.toString(),
        ["may", "jun", "jul", "ago", "sep", "oct"].map((label, i) => ({
          month: `2026-0${i + 5}`,
          label,
          stamps: i === 5 ? 14 : i === 4 ? 10 : 0,
          customers: i === 5 ? 6 : 0,
          redeems: i === 5 ? 1 : 0,
          current: i === 5,
        })),
      ])
    ),
}))

import LocalPage from "@/app/local/page"

describe("/local", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStats.mockResolvedValue({ cards: 10, inWallet: 8, customers: 5, cardsWithSecondStamp: 4, stampsLast7Days: 6, redeems: 1, invitedCards: 2 })
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
    // Encargados o personal de alguna sucursal.
    expect(mockPrograms).toHaveBeenCalledWith({
      $or: [
        { staffEmails: "caja@polvorin.com" },
        { employeeEmails: "caja@polvorin.com" },
        { "branches.staffEmails": "caja@polvorin.com" },
      ],
    })
  })

  it("shows stats, the week chart, the tools and the share link", async () => {
    mockSession.mockResolvedValue({ user: { email: "caja@polvorin.com", role: "user" } })
    const html = renderToStaticMarkup(await LocalPage())
    expect(html).toContain("Polvorín")
    expect(html).toContain("Activa")
    expect(html).toContain("Agregar persona")
    // Volvieron sobre los clientes que vinieron (4 de 5), no sobre las tarjetas creadas.
    expect(html).toContain("80%")
    expect(html).toContain("Tienen tu tarjeta")
    // El aviso le llega a los que la guardaron, no a todas las tarjetas creadas.
    expect(html).toContain("Mandar a 8 clientes")
    expect(html).toContain("Sellos por mes")
    expect(html).toContain("14</strong> este mes")
    expect(html).toContain("+40% vs. sep")
    expect(html).toContain("Clientes que sumaron sellos")
    expect(html).toContain("5</strong> clientes en 7 días")
    expect(html).toContain("Hoy")
    expect(html).toContain("Mandá un aviso a tus clientes")
    expect(html).toContain("Sello doble")
    expect(html).toContain("Imprimir cartel con QR")
    expect(html).toContain(`/tarjeta/${programId}`)
    expect(html).toContain('href="/lugar/polvorin"')
    // El encargado puede cambiar los sellos y el premio.
    expect(html).toContain("Sellos y premio")
    expect(html).toContain("una vez cada 15 días")
  })

  it("an employee only stamps: no notices, promos or reward changes", async () => {
    mockPrograms.mockResolvedValue([
      {
        _id: programId,
        placeId,
        stampsForReward: 10,
        reward: "Cookie",
        staffEmails: ["duenio@polvorin.com"],
        employeeEmails: ["caja@polvorin.com"],
        active: true,
      },
    ])
    mockSession.mockResolvedValue({ user: { email: "caja@polvorin.com", role: "user" } })
    const html = renderToStaticMarkup(await LocalPage())
    expect(html).toContain("Escanear tarjeta")
    expect(html).not.toContain("Mandá un aviso a tus clientes")
    expect(html).not.toContain("Sellos y premio")
    expect(html).toContain("las promos y el premio los maneja el encargado")
    expect(html).not.toContain("Agregar persona")
  })

  it("after a change, the shop sees until when it has to wait", async () => {
    mockPrograms.mockResolvedValue([
      {
        _id: programId,
        placeId,
        stampsForReward: 8,
        reward: "Café",
        staffEmails: ["caja@polvorin.com"],
        active: true,
        shopRewardChangedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ])
    mockSession.mockResolvedValue({ user: { email: "caja@polvorin.com", role: "user" } })
    const html = renderToStaticMarkup(await LocalPage())
    expect(html).toContain("Lo vas a poder cambiar de nuevo")
  })

  it("explains what to do while nobody has stamped yet, instead of empty charts", async () => {
    mockSession.mockResolvedValue({ user: { email: "caja@polvorin.com", role: "user" } })
    mockStats.mockResolvedValue({ cards: 2, inWallet: 1, customers: 0, cardsWithSecondStamp: 0, stampsLast7Days: 0, redeems: 0, invitedCards: 0 })
    const html = renderToStaticMarkup(await LocalPage())
    expect(html).toContain("Todavía nadie sumó un sello")
    expect(html).not.toContain("Sellos por mes")
    expect(html).toContain("Mandar a 1 cliente")
  })
})
