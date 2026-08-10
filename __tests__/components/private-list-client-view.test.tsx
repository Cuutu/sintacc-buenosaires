import { LIST_VISIBILITY } from "@/lib/lists/constants"
import type { ListWithDetails } from "@/components/lists/ListCard"
import { isPrivateListPath } from "@/lib/lists/is-private-list-path"
import fs from "fs"
import path from "path"

describe("PrivateListClientView contract (guía premium)", () => {
  it("exporta componente y fuentes clave", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@/components/lists/PrivateListClientView")
    expect(typeof mod.PrivateListClientView).toBe("function")

    const list: ListWithDetails = {
      _id: "list1",
      name: "Tu guía sin gluten en Buenos Aires",
      description: "Selección personalizada",
      destination: "Buenos Aires",
      isPublic: false,
      visibility: LIST_VISIBILITY.PRIVATE_LINK,
      likesCount: 0,
      createdBy: { _id: "u1", name: "Celíacos Viajeros" },
      placeNotes: [{ placeId: "p1", note: "Pedí sin pan" }],
      placeIds: [{ _id: "p1", name: "Café Seguro", neighborhood: "Palermo" }],
    }
    expect(list.placeNotes?.[0]?.note).toBeTruthy()

    const src = fs.readFileSync(
      path.join(process.cwd(), "components/lists/PrivateListClientView.tsx"),
      "utf8"
    )
    expect(src).toMatch(/Ver todos en el mapa/)
    expect(src).toMatch(/Preparada por/)
    expect(src).toMatch(/Lista privada/)
    expect(src).toMatch(/dynamic\(/)
    expect(src).not.toMatch(/Regenerar|Revocar acceso|Eliminar lista/)
  })

  it("chrome global se aísla por path helper", () => {
    expect(isPrivateListPath("/listas/privadas/token")).toBe(true)
    const chrome = fs.readFileSync(
      path.join(process.cwd(), "components/layout/LayoutChrome.tsx"),
      "utf8"
    )
    expect(chrome).toContain("isPrivateListPath")
    const install = fs.readFileSync(
      path.join(process.cwd(), "components/pwa/InstallPrompt.tsx"),
      "utf8"
    )
    expect(install).toContain("isPrivateListPath")
    const onboard = fs.readFileSync(
      path.join(process.cwd(), "components/onboarding/OnboardingModal.tsx"),
      "utf8"
    )
    expect(onboard).toContain("isPrivateListPath")
  })
})
