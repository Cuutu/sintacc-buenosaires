import { formatPhoneForDisplay } from "@/lib/phone-display"

describe("formatPhoneForDisplay", () => {
  it.each([
    ["0111530105978", "011 15 3010-5978"],
    ["111530105978", "011 15 3010-5978"],
    ["01145678901", "011 4567-8901"],
    ["1145678901", "011 4567-8901"],
    ["5491130105978", "+54 9 11 3010-5978"],
    ["+5491130105978", "+54 9 11 3010-5978"],
    ["+541145678901", "+54 11 4567-8901"],
    ["45678901", "4567-8901"],
  ])("%s → %s", (raw, expected) => {
    expect(formatPhoneForDisplay(raw)).toBe(expected)
  })

  it("respeta lo que ya viene con formato", () => {
    expect(formatPhoneForDisplay("0351 422-1234")).toBe("0351 422-1234")
    expect(formatPhoneForDisplay("(0223) 491-1234")).toBe("(0223) 491-1234")
  })

  it("lo que no reconoce queda como vino", () => {
    expect(formatPhoneForDisplay("03514221234")).toBe("03514221234")
    expect(formatPhoneForDisplay("+34912345678")).toBe("+34912345678")
    expect(formatPhoneForDisplay("")).toBe("")
    expect(formatPhoneForDisplay(undefined)).toBe("")
  })
})
