/**
 * @jest-environment node
 */
import {
  LIST_SHARE_LABELS,
  linkActionForShareChange,
  listShareState,
  listShareUrl,
  visibilityForShareState,
} from "@/lib/lists/share-state"

const ORIGIN = "https://www.celimap.com.ar"

describe("cómo se comparte una lista", () => {
  it("Pública, Con enlace y Privada (enlace revocado)", () => {
    expect(listShareState({ visibility: "PUBLIC", isPublic: true })).toBe("public")
    expect(listShareState({ isPublic: true })).toBe("public")
    expect(listShareState({ visibility: "PRIVATE_LINK", linkStatus: "active" })).toBe("link")
    expect(listShareState({ visibility: "PRIVATE_LINK", linkStatus: "revoked" })).toBe("private")
    expect(listShareState({ visibility: "PRIVATE_LINK", linkStatus: "archived" })).toBe("private")
    expect(LIST_SHARE_LABELS).toEqual({ public: "Pública", link: "Con enlace", private: "Privada" })
  })

  it("copiar enlace también en las públicas; las privadas no tienen", () => {
    expect(listShareUrl({ _id: "l1", visibility: "PUBLIC" }, ORIGIN)).toBe(`${ORIGIN}/listas/l1`)
    expect(
      listShareUrl({ _id: "l1", visibility: "PRIVATE_LINK", linkStatus: "active", privateSharePath: "/listas/privadas/abc" }, ORIGIN)
    ).toBe(`${ORIGIN}/listas/privadas/abc`)
    expect(listShareUrl({ _id: "l1", visibility: "PRIVATE_LINK", linkStatus: "revoked" }, ORIGIN)).toBeNull()
  })

  it("guardar Pública / Con enlace / Privada con lo que ya existe en el modelo", () => {
    expect(visibilityForShareState("public")).toBe("PUBLIC")
    expect(visibilityForShareState("link")).toBe("PRIVATE_LINK")
    expect(visibilityForShareState("private")).toBe("PRIVATE_LINK")
    // Crear privada: se crea con enlace y se revoca.
    expect(linkActionForShareChange(null, "private")).toBe("revoke")
    expect(linkActionForShareChange("public", "private")).toBe("revoke")
    expect(linkActionForShareChange("link", "private")).toBe("revoke")
    expect(linkActionForShareChange("private", "link")).toBe("enable")
    expect(linkActionForShareChange("private", "private")).toBeNull()
    expect(linkActionForShareChange("public", "link")).toBeNull()
    expect(linkActionForShareChange("link", "public")).toBeNull()
  })
})
