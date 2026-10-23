/**
 * @jest-environment node
 */
import { renderToStaticMarkup } from "react-dom/server"
import { ListCard, type ListWithDetails } from "@/components/lists/ListCard"

const place = (i: number) => ({ _id: `p${i}`, name: `Lugar ${i}`, neighborhood: "Centro" })

const list = (overrides: Partial<ListWithDetails>): ListWithDetails => ({
  _id: "l1",
  name: "Lugares en Córdoba",
  placeIds: [1, 2, 3, 4].map(place),
  createdBy: { _id: "u1", name: "Franco" },
  likesCount: 0,
  isPublic: true,
  ...overrides,
})

describe("ListCard: cantidad de lugares", () => {
  it("en /listas muestra el total, no los 4 que se cargan para la foto", () => {
    const html = renderToStaticMarkup(<ListCard list={list({ placesCount: 15 })} />)
    expect(html).toContain("15 lugares")
    expect(html).not.toContain("4 lugares")
  })

  it("sin placesCount (mis listas, con todos cargados) cuenta los lugares", () => {
    const html = renderToStaticMarkup(<ListCard list={list({})} />)
    expect(html).toContain("4 lugares")
  })

  it("un solo lugar va en singular", () => {
    const html = renderToStaticMarkup(
      <ListCard list={list({ placeIds: [place(1)], placesCount: 1 })} />
    )
    expect(html).toContain("1 lugar<")
  })
})
