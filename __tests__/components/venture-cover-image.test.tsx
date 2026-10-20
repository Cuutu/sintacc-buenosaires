/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server"
import { VentureCoverImage } from "@/components/ventures/VentureCoverImage"
import { ventureSchema } from "@/lib/validations"

describe("portada de emprendimiento: foto o logo", () => {
  it("una foto llena el recuadro", () => {
    const html = renderToStaticMarkup(<VentureCoverImage src="https://res.cloudinary.com/x/foto.jpg" sizes="200px" />)
    expect(html).toContain("object-cover")
    expect(html).not.toContain("object-contain")
  })

  it("un logo va entero, con aire y el blanco fundido con el crema", () => {
    const html = renderToStaticMarkup(<VentureCoverImage src="https://res.cloudinary.com/x/logo.png" sizes="200px" isLogo />)
    expect(html).toContain("object-contain")
    expect(html).toContain("p-[14%]")
    expect(html).toContain("mix-blend-multiply")
  })

  it("el admin puede guardar la marca de logo", () => {
    const parsed = ventureSchema.partial().parse({ coverIsLogo: true })
    expect(parsed.coverIsLogo).toBe(true)
    expect(() => ventureSchema.partial().parse({ coverIsLogo: "sí" })).toThrow()
  })
})
