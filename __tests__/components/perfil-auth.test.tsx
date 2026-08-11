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
    mockFetchApi.mockResolvedValue({ favorites: [], hasAppleSub: false })
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
