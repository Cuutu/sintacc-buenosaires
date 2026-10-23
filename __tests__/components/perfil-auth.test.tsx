/**
 * @jest-environment jsdom
 */
import React, { act } from "react"
import { createRoot, Root } from "react-dom/client"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

const mockReplace = jest.fn()
const mockPush = jest.fn()
const mockRouter = { replace: mockReplace, push: mockPush }
const mockUseSession = jest.fn()
const mockFetchApi = jest.fn()
const mockSignOut = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}))

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => React.createElement("a", { href }, children),
}))

jest.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}))

jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: { alt?: string }) =>
    React.createElement("img", { alt: props.alt || "" }),
}))

jest.mock("@/lib/fetchApi", () => ({
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}))

// virtual + ruta relativa: en main el componente existe (tarjeta de fidelidad) y en rediseno-edicion todavía no.
jest.mock(
  "../../components/wallet/LocalPanelEntry",
  () => ({
    LocalPanelEntry: () => null,
  }),
  { virtual: true }
)

jest.mock("@/components/delete-account-section", () => ({
  DeleteAccountSection: () =>
    React.createElement("div", { "data-testid": "delete-account-stub" }),
}))

import PerfilPage from "@/app/perfil/page"

async function mount(): Promise<{ root: Root; el: HTMLDivElement }> {
  const el = document.createElement("div")
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(React.createElement(PerfilPage))
  })
  return { root, el }
}

async function flush(ms = 30) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

describe("PerfilPage auth states", () => {
  let root: Root | null = null

  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = ""
    root = null
    mockFetchApi.mockResolvedValue({ favorites: [], lists: [], hasAppleSub: false })
  })

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root!.unmount()
      })
      root = null
    }
  })

  it("9. loading → skeleton, no redirect", async () => {
    mockUseSession.mockReturnValue({ data: null, status: "loading" })
    const mounted = await mount()
    root = mounted.root
    await flush()
    expect(mounted.el.querySelector('[data-auth-state="loading"]')).toBeTruthy()
    expect(mounted.el.querySelector(".animate-pulse")).toBeTruthy()
    expect(mockReplace).not.toHaveBeenCalled()
    expect(mounted.el.textContent).not.toMatch(/Cerrar sesión/)
  })

  it("10. unauthenticated → redirect with callbackUrl", async () => {
    mockUseSession.mockReturnValue({ data: null, status: "unauthenticated" })
    const mounted = await mount()
    root = mounted.root
    await flush()
    expect(mockReplace).toHaveBeenCalledWith("/login?callbackUrl=/perfil")
  })

  it("11. authenticated without session.user.id → redirect", async () => {
    mockUseSession.mockReturnValue({
      data: { user: undefined, expires: new Date().toISOString() },
      status: "authenticated",
    })
    const mounted = await mount()
    root = mounted.root
    await flush()
    expect(mockReplace).toHaveBeenCalledWith("/login?callbackUrl=/perfil")
    expect(mounted.el.querySelector('[data-auth-state="redirecting"]')).toBeTruthy()
    expect(mounted.el.textContent).not.toMatch(/Cerrar sesión/)
  })

  it("12. authenticated with valid user → profile content", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "507f1f77bcf86cd799439011",
          name: "Franco Test",
          email: "franco@test.com",
          role: "user",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
      status: "authenticated",
    })
    const mounted = await mount()
    root = mounted.root
    await flush()
    expect(mockReplace).not.toHaveBeenCalled()
    expect(mounted.el.querySelector('[data-auth-state="authenticated"]')).toBeTruthy()
    expect(mounted.el.textContent).toMatch(/Franco Test/)
    expect(mounted.el.textContent).toMatch(/franco@test.com/)
    expect(mounted.el.textContent).toMatch(/Cerrar sesión/)
    expect(mounted.el.querySelector('[data-testid="delete-account-stub"]')).toBeTruthy()
  })
})

const authedSession = {
  data: {
    user: { id: "507f1f77bcf86cd799439011", name: "Franco Test", email: "franco@test.com", role: "user" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  },
  status: "authenticated",
}

const savedPlace = (i: number, photos: string[] = []) => ({
  _id: `p${i}`,
  name: `Lugar ${i}`,
  neighborhood: "Palermo",
  slug: `lugar-${i}`,
  type: "cafe",
  tags: ["100_gf"],
  photos,
})

/** Revisión del perfil (23/10). */
describe("PerfilPage contenido", () => {
  let root: Root | null = null

  function apiWith({ favorites = 0, lists = 0 }: { favorites?: number; lists?: number }) {
    mockFetchApi.mockImplementation((url: string) => {
      if (url === "/api/favorites") {
        return Promise.resolve({
          favorites: Array.from({ length: favorites }, (_, i) =>
            ({ placeId: savedPlace(i, i === 0 ? ["https://res.cloudinary.com/demo/image/upload/a.jpg"] : []) })
          ),
        })
      }
      if (url === "/api/lists?mine=1") {
        return Promise.resolve({
          lists: Array.from({ length: lists }, (_, i) => ({ _id: `l${i}`, name: `Lista ${i}`, placesCount: i + 1 })),
        })
      }
      return Promise.resolve({ hasAppleSub: false })
    })
  }

  async function render() {
    mockUseSession.mockReturnValue(authedSession)
    const mounted = await mount()
    root = mounted.root
    await flush()
    return mounted.el
  }

  beforeEach(() => {
    jest.clearAllMocks()
    document.body.innerHTML = ""
  })

  afterEach(async () => {
    if (root) {
      await act(async () => root!.unmount())
      root = null
    }
  })

  it("encabezado con frase en cursiva + título grande, como Guardados y /local", async () => {
    apiWith({})
    const el = await render()
    const h1 = el.querySelector("h1")
    expect(h1?.textContent).toBe("Mi perfil")
    expect(h1?.className).toContain("font-extrabold")
    const kicker = h1?.previousElementSibling
    expect(kicker?.textContent).toBe("hola, Franco")
    expect(kicker?.className).toContain("italic")
  })

  it("sin 'Sugerir un lugar' (ya está en la franja naranja)", async () => {
    apiWith({})
    const el = await render()
    expect(el.textContent).not.toMatch(/Sugerir un lugar/)
  })

  it("guardados con foto miniatura, sin emoji", async () => {
    apiWith({ favorites: 3 })
    const el = await render()
    const thumbs = el.querySelectorAll('[data-testid="saved-place-thumb"]')
    expect(thumbs).toHaveLength(3)
    expect(thumbs[0].querySelector("img")).toBeTruthy()
    expect(el.textContent).not.toMatch(/[☕🍽️🛒🥐📍]/u)
  })

  it("un solo link a /favoritos y ningún botón dentro de un link", async () => {
    apiWith({ favorites: 8, lists: 1 })
    const el = await render()
    const toFavoritos = [...el.querySelectorAll("a")].filter((a) => a.getAttribute("href") === "/favoritos")
    expect(toFavoritos).toHaveLength(1)
    expect(toFavoritos[0].textContent).toBe("Ver los 8 guardados")
    expect(el.textContent).not.toMatch(/restantes/)
    expect(el.querySelector("a button, button a")).toBeNull()
    // Muestra 5 y el resto queda en Guardados.
    expect(el.querySelectorAll('[data-testid="saved-place-thumb"]')).toHaveLength(5)
  })

  it("sección Mis listas con acceso a Guardados > Mis listas", async () => {
    apiWith({ lists: 4 })
    const el = await render()
    expect(el.querySelector("#perfil-listas")?.textContent).toBe("Mis listas")
    const link = [...el.querySelectorAll("a")].find((a) => a.textContent === "Ver mis listas")
    expect(link?.getAttribute("href")).toBe("/favoritos?tab=listas")
    expect(el.querySelector('a[href="/listas/l0"]')?.textContent).toMatch(/Lista 0.*1 lugar/)
    expect(el.textContent).toMatch(/y 1 lista más/)
  })

  it("sin listas: invita a crear una", async () => {
    apiWith({})
    const el = await render()
    const link = [...el.querySelectorAll("a")].find((a) => a.textContent === "Crear una lista")
    expect(link?.getAttribute("href")).toBe("/favoritos?tab=listas")
  })
})
