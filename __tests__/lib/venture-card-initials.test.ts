/**
 * @jest-environment node
 */
import { ventureInitials } from "@/lib/venture-initials"

describe("ventureInitials", () => {
  it("usa primeras letras de dos palabras", () => {
    expect(ventureInitials("Modo Celiaco")).toBe("MC")
    expect(ventureInitials("Samu Sin tacc")).toBe("SS")
  })

  it("recorta un solo nombre", () => {
    expect(ventureInitials("Tia Emma")).toBe("TE")
    expect(ventureInitials("GĀO")).toBe("GO")
  })
})
