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
  employeeEmails: [],
  brandName: "",
  branches: [],
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

  it("tells managers from employees", () => {
    const html = renderToStaticMarkup(
      <AdminLoyaltySection
        initialPrograms={[
          { ...row("a", "Polvorín", 6, 5), staffEmails: ["duenio@polvorin.com"], employeeEmails: ["caja@polvorin.com"] },
        ]}
      />
    )
    const managers = html.indexOf("Encargados")
    const employees = html.indexOf("Empleados")
    expect(managers).toBeGreaterThan(-1)
    expect(html.indexOf("duenio@polvorin.com")).toBeGreaterThan(managers)
    expect(html.indexOf("duenio@polvorin.com")).toBeLessThan(employees)
    expect(html.indexOf("caja@polvorin.com")).toBeGreaterThan(employees)
    expect(html).toContain("Agregar persona")
  })

  it("lists the employees of each branch in their own group", () => {
    const html = renderToStaticMarkup(
      <AdminLoyaltySection
        initialPrograms={[
          {
            ...row("a", "Polvorín Palermo", 6, 5),
            brandName: "Polvorín",
            employeeEmails: ["caja@polvorin.com"],
            branches: [{ placeId: "s1", name: "Polvorín Belgrano", staffEmails: ["mozo@polvorin.com"] }],
          },
        ]}
      />
    )
    expect(html).toContain("Empleados de Polvorín Palermo")
    expect(html).toContain("Empleados de Polvorín Belgrano")
    expect(html.indexOf("mozo@polvorin.com")).toBeGreaterThan(html.indexOf("Empleados de Polvorín Belgrano"))
  })
})
