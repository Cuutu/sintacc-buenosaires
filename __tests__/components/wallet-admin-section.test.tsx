/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server"
import { AdminLoyaltySection } from "@/components/admin/AdminLoyaltySection"
import type { AdminProgramRow } from "@/lib/wallet/loyalty-admin"

const months = (current: number, previous: number) =>
  ["may", "jun", "jul", "ago", "sep", "oct"].map((label, i) => ({
    month: `2026-${String(i + 5).padStart(2, "0")}`,
    label,
    stamps: i === 5 ? current : i === 4 ? previous : 0,
    customers: i === 5 ? 3 : 0,
    redeems: 0,
    current: i === 5,
  }))

const row = (id: string, placeName: string, current: number, previous: number): AdminProgramRow => ({
  id,
  placeId: `p${id}`,
  placeName,
  stampsForReward: 10,
  reward: "Cookie",
  staffEmails: [],
  active: true,
  enrollPath: `/tarjeta/${id}`,
  stats: { cards: 4, inWallet: 3, customers: 3, cardsWithSecondStamp: 1, stampsLast7Days: 2, redeems: 0, invitedCards: 0 },
  notice: null,
  doubleStamp: null,
  referralEnabled: false,
  monthly: months(current, previous),
})

describe("AdminLoyaltySection", () => {
  it("shows this month's stamps per place, most used first", () => {
    const html = renderToStaticMarkup(
      <AdminLoyaltySection initialPrograms={[row("a", "Polvorín", 6, 5), row("b", "Otro Local", 20, 10)]} />
    )
    expect(html).toContain("Sellos de oct")
    expect(html).toContain("26</strong> en total")
    expect(html).toContain("(+73% vs. el mes pasado)")
    expect(html.indexOf("Otro Local")).toBeLessThan(html.indexOf("Polvorín"))
    expect(html).toContain("Sellos por mes")
  })
})
