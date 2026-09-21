/**
 * @jest-environment node
 */
import { placeSchema } from "@/lib/validations"

describe("placeSchema province and locality fields", () => {
  it("accepts province and locality in partial parse", () => {
    const result = placeSchema.partial().parse({
      province: "santa-fe",
      locality: "rosario",
    })

    expect(result.province).toBe("santa-fe")
    expect(result.locality).toBe("rosario")
  })

  it("accepts province and locality in full parse with required fields", () => {
    const result = placeSchema.parse({
      name: "Test Place",
      type: "restaurant",
      address: "Test Address 123",
      neighborhood: "Test Neighborhood",
      location: { lat: -34.6037, lng: -58.3816 },
      province: "buenos-aires",
      locality: "buenos-aires",
    })

    expect(result.province).toBe("buenos-aires")
    expect(result.locality).toBe("buenos-aires")
  })

  it("allows province without locality", () => {
    const result = placeSchema.partial().parse({
      province: "mendoza",
    })

    expect(result.province).toBe("mendoza")
    expect(result.locality).toBeUndefined()
  })

  it("allows locality without province", () => {
    const result = placeSchema.partial().parse({
      locality: "mendoza",
    })

    expect(result.locality).toBe("mendoza")
    expect(result.province).toBeUndefined()
  })

  it("trims province and locality values", () => {
    const result = placeSchema.partial().parse({
      province: "  tucuman  ",
      locality: "  san-miguel-de-tucuman  ",
    })

    expect(result.province).toBe("tucuman")
    expect(result.locality).toBe("san-miguel-de-tucuman")
  })

  it("rejects empty strings for province", () => {
    expect(() => {
      placeSchema.partial().parse({
        province: "",
      })
    }).toThrow()
  })

  it("rejects empty strings for locality", () => {
    expect(() => {
      placeSchema.partial().parse({
        locality: "",
      })
    }).toThrow()
  })

  it("rejects province values over 100 characters", () => {
    expect(() => {
      placeSchema.partial().parse({
        province: "a".repeat(101),
      })
    }).toThrow()
  })

  it("rejects locality values over 100 characters", () => {
    expect(() => {
      placeSchema.partial().parse({
        locality: "a".repeat(101),
      })
    }).toThrow()
  })
})
