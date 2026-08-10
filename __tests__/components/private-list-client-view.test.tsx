import { LIST_VISIBILITY } from "@/lib/lists/constants"
import type { ListWithDetails } from "@/components/lists/ListCard"

/**
 * Smoke estructural de la vista cliente (sin Testing Library).
 * Cubre layout mobile-first + ausencia de controles admin en el módulo.
 */
describe("PrivateListClientView contract", () => {
  it("exporta componente y lista de ejemplo cumple contrato mobile", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@/components/lists/PrivateListClientView")
    expect(typeof mod.PrivateListClientView).toBe("function")

    const list: ListWithDetails = {
      _id: "list1",
      name: "Recomendaciones Madrid",
      description: "Para el viaje",
      destination: "Madrid",
      isPublic: false,
      visibility: LIST_VISIBILITY.PRIVATE_LINK,
      likesCount: 0,
      createdBy: { _id: "u1", name: "Celíacos Viajeros" },
      placeNotes: [{ placeId: "p1", note: "Pedí la tortilla sin gluten" }],
      placeIds: [
        {
          _id: "p1",
          name: "Café Seguro",
          neighborhood: "Centro",
        },
      ],
    }

    expect(list.visibility).toBe(LIST_VISIBILITY.PRIVATE_LINK)
    expect(list.placeNotes?.[0]?.note).toBeTruthy()
    // Fuente del componente usa max-w-lg (mobile-first)
    const fs = require("fs")
    const src = fs.readFileSync(
      require("path").join(
        process.cwd(),
        "components/lists/PrivateListClientView.tsx"
      ),
      "utf8"
    )
    expect(src).toContain("max-w-lg")
    expect(src).toMatch(/verificá siempre la información/i)
    expect(src).not.toMatch(/Regenerar|Revocar acceso|Eliminar lista/)
  })
})
