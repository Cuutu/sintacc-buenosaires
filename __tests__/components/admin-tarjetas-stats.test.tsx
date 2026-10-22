/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server"
import { AdminLoyaltySection, loyaltyStatTiles } from "@/components/admin/AdminLoyaltySection"
import type { AdminProgramRow } from "@/lib/wallet/loyalty-admin"

const program = (over: Partial<AdminProgramRow> = {}): AdminProgramRow => ({
  id: "a",
  placeId: "pa",
  placeName: "Polvorín",
  stampsForReward: 10,
  reward: "Cookie",
  staffEmails: [],
  brandName: "",
  branches: [],
  active: true,
  enrollPath: "/tarjeta/a",
  stats: { cards: 4, inWallet: 3, customers: 3, cardsWithSecondStamp: 1, stampsLast7Days: 2, redeems: 0, invitedCards: 0 },
  notice: null,
  doubleStamp: null,
  referralEnabled: false,
  monthly: [],
  ...over,
})

describe("Tarjetas: números de cada local", () => {
  it("etiquetas cortas, en una línea y sin mayúsculas sostenidas", () => {
    const labels = loyaltyStatTiles(program(), 33).map(([label]) => label)
    expect(labels).toEqual(["Visitas 7 días", "Con la tarjeta", "Vinieron", "Tarjetas creadas", "Volvieron", "Canjes"])
    for (const label of labels) expect(label.length).toBeLessThanOrEqual(16)
    expect(loyaltyStatTiles(program({ referralEnabled: true }), 0).map(([l]) => l)).toContain("Invitados")
  })

  it("cada número es una StatTile de una línea (truncate), no la caja vieja en mayúsculas", () => {
    const html = renderToStaticMarkup(<AdminLoyaltySection initialPrograms={[program()]} />)
    expect(html).toContain("Visitas 7 días")
    expect(html).not.toContain("Visitas (7 días)")
    expect(html).toMatch(/<p class="truncate [^"]*"[^>]*title="Visitas 7 días">Visitas 7 días<\/p>/)
  })

  it("Activa / Pausada es una etiqueta de estado, no un botón", () => {
    const active = renderToStaticMarkup(<AdminLoyaltySection initialPrograms={[program()]} />)
    expect(active).toMatch(/<span class="[^"]*bg-success-soft[^"]*">.*?Activa<\/span>/)
    expect(active).not.toMatch(/<button[^>]*>[^<]*Activa/)
    const paused = renderToStaticMarkup(<AdminLoyaltySection initialPrograms={[program({ active: false })]} />)
    expect(paused).toMatch(/<span class="[^"]*bg-olive\/8[^"]*">.*?Pausada<\/span>/)
  })
})
