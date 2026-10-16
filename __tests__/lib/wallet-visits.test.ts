/**
 * @jest-environment node
 */
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/models/LoyaltyStamp", () => ({ LoyaltyStamp: {} }))

import { argentinaDate, fillLastDays } from "@/lib/wallet/visits"

describe("visitas por día", () => {
  it("uses Argentina's date", () => {
    // 01:00 UTC del viernes = jueves 22 h en Argentina.
    expect(argentinaDate(new Date("2026-10-16T01:00:00Z"))).toBe("2026-10-15")
  })

  it("fills the last 7 days with zeros, ending today", () => {
    const now = new Date("2026-10-16T15:00:00Z") // viernes
    const days = fillLastDays([{ _id: "2026-10-16", visits: 4 }, { _id: "2026-10-13", visits: 2 }], now)
    expect(days.map((d) => d.date)).toEqual([
      "2026-10-10",
      "2026-10-11",
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
    ])
    expect(days.map((d) => d.label)).toEqual(["Sáb", "Dom", "Lun", "Mar", "Mié", "Jue", "Vie"])
    expect(days.map((d) => d.visits)).toEqual([0, 0, 0, 2, 0, 0, 4])
    expect(days.filter((d) => d.today).map((d) => d.date)).toEqual(["2026-10-16"])
  })
})
