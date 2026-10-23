/**
 * @jest-environment node
 *
 * Revisión 23/10 de Guardados, Listas y los modales de listas.
 */
import fs from "fs"
import path from "path"
import { renderToStaticMarkup } from "react-dom/server"
import { OwnerListCard } from "@/components/lists/OwnerListCard"
import { ListCard, type ListWithDetails } from "@/components/lists/ListCard"
import { moveId, orderPlaceRows, type PlaceLite } from "@/components/lists/ListFormParts"
import { isShortContentRoute } from "@/components/layout/LayoutChrome"

const root = path.join(__dirname, "../..")
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8")

const noop = () => {}

const list = (overrides: Partial<ListWithDetails> = {}): ListWithDetails => ({
  _id: "l1",
  name: "Lugares en Córdoba",
  placeIds: [{ _id: "p1", name: "Lugar 1", neighborhood: "Centro" }],
  placesCount: 8,
  createdBy: { _id: "u1", name: "Franco" },
  likesCount: 0,
  isPublic: true,
  visibility: "PUBLIC",
  ...overrides,
})

function ownerCard(l: ListWithDetails) {
  return renderToStaticMarkup(
    <OwnerListCard
      list={l}
      onManage={noop}
      onCopyLink={noop}
      onPreview={noop}
      onDuplicate={noop}
      onRegenerate={noop}
      onDelete={noop}
    />
  )
}

function copyButton(html: string): string {
  const match = html.match(/<button[^>]*>(?:(?!<\/button>).)*Copiar enlace<\/button>/)
  if (!match) throw new Error("no hay botón Copiar enlace")
  return match[0]
}

describe("Mis listas: tarjeta de la dueña", () => {
  it("las públicas también tienen Copiar enlace (habilitado)", () => {
    const html = ownerCard(list())
    expect(html).toContain("Pública")
    expect(copyButton(html)).not.toMatch(/\sdisabled=""/)
  })

  it("con enlace activo: sello legible 'Con enlace' y se puede copiar", () => {
    const html = ownerCard(
      list({ isPublic: false, visibility: "PRIVATE_LINK", linkStatus: "active", privateSharePath: "/listas/privadas/x" })
    )
    expect(html).toContain("Con enlace")
    expect(html).not.toContain("Enlace activo")
    expect(copyButton(html)).not.toMatch(/\sdisabled=""/)
  })

  it("privada (enlace revocado): sin enlace que copiar", () => {
    const html = ownerCard(list({ isPublic: false, visibility: "PRIVATE_LINK", linkStatus: "revoked" }))
    expect(html).toContain("Privada")
    expect(copyButton(html)).toMatch(/\sdisabled=""/)
  })

  it("misma cara que /listas: nombre en Fraunces itálica sobre la portada y la cuenta abajo", () => {
    for (const html of [ownerCard(list()), renderToStaticMarkup(<ListCard list={list()} />)]) {
      expect(html).toContain("font-serif")
      expect(html).toContain("italic")
      expect(html).toContain("8 lugares")
      expect(html).toContain("Franco")
    }
  })

  it("la de /listas no lleva el sello de visibilidad (es de la comunidad)", () => {
    const html = renderToStaticMarkup(<ListCard list={list()} />)
    expect(html).not.toContain("Pública")
  })
})

describe("modales: orden de los lugares", () => {
  const place = (id: string): PlaceLite => ({ _id: id, name: `Lugar ${id}` })

  it("primero los de la lista, en su orden; después el resto sin repetir", () => {
    const pool = new Map(["a", "b", "c", "d"].map((id) => [id, place(id)]))
    const rows = orderPlaceRows(["c", "a"], pool, [place("a"), place("b"), place("c"), place("d")])
    expect(rows.map((p) => p._id)).toEqual(["c", "a", "b", "d"])
  })

  it("ignora ids que no están cargados", () => {
    const rows = orderPlaceRows(["x", "a"], new Map([["a", place("a")]]), [])
    expect(rows.map((p) => p._id)).toEqual(["a"])
  })

  it("moveId sube y baja sin salirse de los bordes", () => {
    expect(moveId(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"])
    expect(moveId(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"])
    expect(moveId(["a", "b"], "a", -1)).toEqual(["a", "b"])
    expect(moveId(["a", "b"], "z", 1)).toEqual(["a", "b"])
  })
})

describe("modales: textos y celular", () => {
  const parts = read("components/lists/ListFormParts.tsx")
  const create = read("components/lists/CreateListModal.tsx")
  const manage = read("components/lists/ManageListModal.tsx")

  it("ejemplos argentinos y 'datos personales'", () => {
    for (const src of [parts, create, manage]) {
      expect(src).not.toMatch(/Madrid|María —|datos sensibles del viajero/)
    }
    expect(parts).toContain("Ej: Salidas sin TACC en Palermo")
    expect(parts).toContain("Ej: Bariloche, Río Negro")
    expect(create).toContain("datos personales")
    expect(manage).toContain("datos personales")
  })

  it("visibilidad y buscador en los dos modales", () => {
    for (const src of [create, manage]) {
      expect(src).toContain("<ListVisibilityField")
      expect(src).toContain("<PlaceSearchBox")
      expect(src).toContain("listModalUi.footer")
    }
    expect(parts).toContain("Buscar lugares para agregar")
    // Sin el permiso de listas privadas, el subtítulo no promete visibilidad.
    expect(manage).toContain("Editá los lugares y las notas. No pongas datos personales.")
  })

  it("en el celular: acciones fijas abajo, campos de 16 px y filas de 44 px", () => {
    expect(parts).toMatch(/footer:\s*\n?\s*"sticky bottom-0/)
    expect(parts).toContain('field: "mt-1.5 text-base"')
    expect(parts).toContain("min-h-[44px]")
    expect(read("components/ui/textarea.tsx")).toContain("text-base")
    expect(read("components/ui/dialog.tsx")).toMatch(/DialogPrimitive\.Close className="[^"]*h-11 w-11/)
  })

  it("al abrir no salta el teclado ni lo tapa CeliBot", () => {
    expect(create).toContain("onOpenAutoFocus={focusDialogContent}")
    expect(manage).toContain("onOpenAutoFocus={focusDialogContent}")
    expect(read("components/chat/chat-ui.css")).toMatch(
      /body\[data-scroll-locked\] \.celimap-chat-dock \{\s*display: none;/
    )
  })

  it("Crear desde la pestaña Favoritos pide antes si puede hacer listas privadas", () => {
    expect(read("app/favoritos/page.tsx")).toMatch(/if \(!listsFetched && !listsLoading\) fetchLists\(\)\s*\n\s*setCreateModalOpen\(true\)/)
  })

  it("una sola portada: 'Máx. 1 imagen'", () => {
    const upload = read("components/image-upload.tsx")
    expect(upload).toContain("Máx. 1 imagen.")
  })
})

describe("Guardados y el detalle de una lista", () => {
  it("/favoritos: título Guardados, Nueva lista, tarjeta nueva y acceso a la comunidad", () => {
    const page = read("app/favoritos/page.tsx")
    expect(page).toContain(">Guardados<")
    expect(page).toContain("Nueva lista")
    expect(page).toContain("Explorar listas de la comunidad")
    expect(page).toContain("<SavedPlaceCard")
    expect(page).not.toContain("100% sin gluten")
    expect(page).not.toContain("ListPlaceCard")
    const layout = read("app/favoritos/layout.tsx")
    expect(layout).toContain('title: "Guardados"')
    expect(layout).toContain("index: false")
  })

  it("/listas/[id]: migas sin 'Volver a guardados', 3 columnas y datos sin '·' colgando", () => {
    const page = read("app/listas/[id]/page.tsx")
    expect(page).not.toContain("Volver a guardados")
    expect(page).not.toContain("Volver a listas")
    expect(page).toContain("<Breadcrumbs")
    expect(page).toContain("lg:grid-cols-3")
    // Ningún "·" suelto como separador (en el celular quedaba colgando al final del renglón).
    expect(page).not.toMatch(/^\s*·\s*$/m)
    expect(page).toContain("<MetaItem")
    expect(page).toContain("una lista de {author}")
    // La dueña gestiona y copia; el me gusta es para los demás.
    expect(page).toMatch(/isOwner \?[\s\S]*Gestionar[\s\S]*Copiar enlace[\s\S]*: session \?[\s\S]*Me gusta/)
  })

  it("el pie sube en Guardados y Listas (sin hueco antes de la franja naranja)", () => {
    expect(isShortContentRoute("/favoritos")).toBe(true)
    expect(isShortContentRoute("/listas")).toBe(true)
    expect(isShortContentRoute("/listas/abc")).toBe(true)
    expect(isShortContentRoute("/listas-sin-tacc")).toBe(false)
    expect(isShortContentRoute("/mapa")).toBe(false)
    expect(isShortContentRoute(null)).toBe(false)
  })

  it("barra de abajo: Guardados queda marcada en /listas y /listas/*", () => {
    const nav = read("components/nav/BottomNav.tsx")
    expect(nav).toContain(
      '(hrefStr === "/favoritos" && (pathname === "/listas" || pathname.startsWith("/listas/")))'
    )
  })

  it("CeliBot más chico en el celular", () => {
    expect(read("components/chat/ChatWidget.tsx")).toContain("h-12 w-12 md:h-16 md:w-16")
    expect(read("components/chat/ChatFab.tsx")).toContain("h-12 w-12")
  })
})
