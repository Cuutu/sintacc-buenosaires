/**
 * @jest-environment jsdom
 */
import React, { act } from "react"
import { createRoot, Root } from "react-dom/client"
import {
  ALLOWED_IMAGE_MIME_TYPES,
  ImageUpload,
  MAX_IMAGE_BYTES,
  validateImageFile,
} from "@/components/image-upload"

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true

async function mount(
  ui: React.ReactElement
): Promise<{ root: Root; el: HTMLDivElement }> {
  const el = document.createElement("div")
  document.body.appendChild(el)
  const root = createRoot(el)
  await act(async () => {
    root.render(ui)
  })
  return { root, el }
}

async function flush(ms = 30) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

function makeFile(name: string, type: string, size: number): File {
  if (size <= 0) return new File([], name, { type })
  return new File([new ArrayBuffer(size)], name, { type })
}

function stubFiles(input: HTMLInputElement, files: File[]) {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: {
      length: files.length,
      item: (i: number) => files[i] ?? null,
      ...Object.fromEntries(files.map((f, i) => [i, f])),
      [Symbol.iterator]: function* () {
        yield* files
      },
    },
  })
}

describe("validateImageFile", () => {
  it("acepta JPEG/PNG/WebP bajo 5MB", () => {
    for (const type of ALLOWED_IMAGE_MIME_TYPES) {
      expect(validateImageFile(makeFile("ok.jpg", type, 1024))).toBeNull()
    }
  })

  it("rechaza vacío / sin tipo / formato inválido / oversized", () => {
    expect(validateImageFile(makeFile("x.jpg", "image/jpeg", 0))).toMatch(
      /leer/
    )
    expect(validateImageFile(makeFile("x.gif", "image/gif", 10))).toMatch(
      /Formato/
    )
    expect(validateImageFile(makeFile("x.jpg", "", 10))).toMatch(/Formato/)
    expect(
      validateImageFile(makeFile("big.jpg", "image/jpeg", MAX_IMAGE_BYTES + 1))
    ).toMatch(/5MB/)
  })
})

describe("ImageUpload", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    document.body.innerHTML = ""
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("cancelación / input vacío no llama fetch ni deja error", async () => {
    const onChange = jest.fn()
    const { el } = await mount(
      <ImageUpload value={[]} onChange={onChange} maxCount={1} />
    )
    const input = el.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.getAttribute("capture")).toBeNull()

    stubFiles(input, [])
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await flush()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(el.querySelector('[role="alert"]')).toBeNull()
  })

  it("archivo inválido muestra error y no sube", async () => {
    const onChange = jest.fn()
    const { el } = await mount(
      <ImageUpload value={[]} onChange={onChange} maxCount={1} />
    )
    const input = el.querySelector('input[type="file"]') as HTMLInputElement
    stubFiles(input, [makeFile("no.gif", "image/gif", 100)])
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await flush()

    expect(global.fetch).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(el.querySelector('[role="alert"]')?.textContent).toMatch(/Formato/)
  })

  it("subida OK llama onChange con URL", async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://cdn.example/a.jpg" }),
    })
    const onChange = jest.fn()
    const { el } = await mount(
      <ImageUpload value={[]} onChange={onChange} folder="lists" maxCount={1} />
    )
    const input = el.querySelector('input[type="file"]') as HTMLInputElement
    stubFiles(input, [makeFile("ok.jpg", "image/jpeg", 200)])
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await flush(80)

    expect(global.fetch).toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith(["https://cdn.example/a.jpg"])
  })

  it("error de red muestra alerta y no rompe", async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error("network"))
    const onChange = jest.fn()
    const { el } = await mount(
      <ImageUpload value={[]} onChange={onChange} maxCount={1} />
    )
    const input = el.querySelector('input[type="file"]') as HTMLInputElement
    stubFiles(input, [makeFile("ok.jpg", "image/jpeg", 200)])
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await flush(80)

    expect(onChange).not.toHaveBeenCalled()
    expect(el.querySelector('[role="alert"]')?.textContent).toMatch(/conexión/)
  })

  it("unmount durante upload no tira setState", async () => {
    let resolveFetch!: (v: unknown) => void
    ;(global.fetch as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )
    const onChange = jest.fn()
    const { root, el } = await mount(
      <ImageUpload value={[]} onChange={onChange} maxCount={1} />
    )
    const input = el.querySelector('input[type="file"]') as HTMLInputElement
    stubFiles(input, [makeFile("ok.jpg", "image/jpeg", 200)])
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }))
    })
    await flush(20)
    await act(async () => {
      root.unmount()
    })
    el.remove()

    resolveFetch({
      ok: true,
      json: async () => ({ url: "https://cdn.example/late.jpg" }),
    })
    await flush(50)

    expect(onChange).not.toHaveBeenCalled()
  })
})
