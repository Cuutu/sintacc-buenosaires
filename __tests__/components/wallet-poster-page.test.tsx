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
  notFound: () => {
    throw new Error("notFound")
  },
}))
const mockGetProgram = jest.fn()
jest.mock("@/lib/wallet/loyalty", () => ({
  ...jest.requireActual("@/lib/wallet/loyalty"),
  getProgramWithPlace: (...a: unknown[]) => mockGetProgram(...a),
}))
jest.mock("@/lib/wallet/config", () => ({
  isApplePassConfigured: () => true,
  isGoogleWalletConfigured: () => true,
}))
const mockPosterQr = jest.fn()
jest.mock("@/lib/wallet/poster-qr", () => {
  const actual = jest.requireActual("@/lib/wallet/poster-qr")
  return {
    ...actual,
    posterQr: (value: string) => {
      mockPosterQr(value)
      return actual.posterQr(value)
    },
  }
})

import CartelPage from "@/app/local/cartel/[programaId]/page"

const programId = new mongoose.Types.ObjectId().toString()

function program(overrides: Record<string, unknown> = {}) {
  return {
    program: {
      _id: new mongoose.Types.ObjectId(programId),
      stampsForReward: 10,
      reward: "Cookie",
      staffEmails: ["caja@polvorin.com"],
      active: true,
      ...overrides,
    },
    placeName: "Polvorín",
    placePath: "/lugar/polvorin",
    safety: "dedicated",
    location: null,
  }
}

async function render(searchParams: Record<string, string> = {}) {
  return renderToStaticMarkup(await CartelPage({ params: { programaId: programId }, searchParams }))
}

describe("/local/cartel/[programaId]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetProgram.mockResolvedValue(program())
  })

  it("sends people without a session to log in and come back", async () => {
    mockSession.mockResolvedValue(null)
    await expect(render()).rejects.toThrow(
      `redirect:/login?callbackUrl=${encodeURIComponent(`/local/cartel/${programId}`)}`
    )
  })

  it("is only for the place's staff or an admin", async () => {
    mockSession.mockResolvedValue({ user: { email: "cliente@gmail.com", role: "user" } })
    await expect(render()).rejects.toThrow("notFound")

    mockSession.mockResolvedValue({ user: { email: "otra@gmail.com", role: "admin" } })
    expect(await render()).toContain("data-cartel")
  })

  it("prints a poster whose QR opens the card page", async () => {
    mockSession.mockResolvedValue({ user: { email: "Caja@Polvorin.com", role: "user" } })
    const html = await render()
    expect(html).toContain("Polvorín")
    expect(html).toContain("Cookie")
    expect(html).toContain("Funciona con Apple Wallet y Google Wallet.")
    expect(html).toContain("size: A5 portrait")
    expect(mockPosterQr).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`/tarjeta/${programId}$`)))
    expect(html).not.toContain("está pausada")
    expect(html).toContain("100% sin TACC")

    expect(await render({ tamano: "a4" })).toContain("size: A4 portrait")
  })

  it("warns when the card is paused", async () => {
    mockSession.mockResolvedValue({ user: { email: "caja@polvorin.com", role: "user" } })
    mockGetProgram.mockResolvedValue(program({ active: false }))
    expect(await render()).toContain("está pausada")
  })
})
