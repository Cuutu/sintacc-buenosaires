/**
 * @jest-environment node
 */
jest.mock("@/lib/mongodb", () => ({ __esModule: true, default: jest.fn() }))
jest.mock("@/models/LoyaltyStamp", () => ({ LoyaltyStamp: {} }))

import mongoose from "mongoose"
import { argentinaMonth, fillMonths, lastMonths, monthChange, monthStart } from "@/lib/wallet/monthly"

describe("sellos por mes", () => {
  it("uses Argentina's month", () => {
    // 01:00 UTC del 1/11 = 31/10 a las 22 h en Argentina.
    expect(argentinaMonth(new Date("2026-11-01T01:00:00Z"))).toBe("2026-10")
    expect(monthStart("2026-10").toISOString()).toBe("2026-10-01T03:00:00.000Z")
  })

  it("lists the last 6 months, crossing the year", () => {
    expect(lastMonths(new Date("2026-10-16T12:00:00Z"))).toEqual([
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ])
    expect(lastMonths(new Date("2027-02-10T12:00:00Z"), 4)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"])
  })

  it("fills months without movement with zeros", () => {
    const a = new mongoose.Types.ObjectId()
    const b = new mongoose.Types.ObjectId()
    const series = fillMonths(
      [{ _id: { program: a, month: "2026-10" }, stamps: 12, customers: 5, redeems: 1 }],
      [a.toString(), b.toString()],
      new Date("2026-10-16T12:00:00Z")
    )
    const ofA = series.get(a.toString())!
    expect(ofA).toHaveLength(6)
    expect(ofA[5]).toEqual({ month: "2026-10", label: "oct", stamps: 12, customers: 5, redeems: 1, current: true })
    expect(ofA[4]).toMatchObject({ month: "2026-09", label: "sep", stamps: 0, current: false })
    expect(series.get(b.toString())!.every((m) => m.stamps === 0)).toBe(true)
  })

  it("compares with the previous month", () => {
    expect(monthChange(14, 10)).toBe("+40%")
    expect(monthChange(9, 10)).toBe("−10%")
    expect(monthChange(10, 10)).toBe("igual")
    expect(monthChange(5, 0)).toBeNull()
  })
})
