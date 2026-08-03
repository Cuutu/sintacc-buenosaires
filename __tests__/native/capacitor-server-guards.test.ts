/**
 * @jest-environment node
 */
describe("capacitor server URL guards", () => {
  const original = { ...process.env }

  afterEach(() => {
    process.env = { ...original }
    jest.resetModules()
  })

  it("default apunta solo a producción", async () => {
    delete process.env.CAPACITOR_SERVER_MODE
    delete process.env.CAPACITOR_SERVER_URL
    const mod = await import("../../capacitor.config")
    expect(mod.default.server?.url).toBe("https://www.celimap.com.ar")
    expect(mod.default.server?.cleartext).toBe(false)
  })

  it("URL sin MODE=preview lanza", async () => {
    process.env.CAPACITOR_SERVER_URL = "https://preview.example.com"
    delete process.env.CAPACITOR_SERVER_MODE
    await expect(import("../../capacitor.config")).rejects.toThrow(/MODE=preview/)
  })

  it("preview con URL custom OK", async () => {
    process.env.CAPACITOR_SERVER_MODE = "preview"
    process.env.CAPACITOR_SERVER_URL = "https://preview.example.com"
    const mod = await import("../../capacitor.config")
    expect(mod.default.server?.url).toBe("https://preview.example.com")
  })

  it("preview no puede ser URL de producción", async () => {
    process.env.CAPACITOR_SERVER_MODE = "preview"
    process.env.CAPACITOR_SERVER_URL = "https://www.celimap.com.ar"
    await expect(import("../../capacitor.config")).rejects.toThrow(/producción/)
  })

  it("preview usa appName CeliMap Preview", async () => {
    process.env.CAPACITOR_SERVER_MODE = "preview"
    process.env.CAPACITOR_SERVER_URL = "https://preview.example.com"
    const mod = await import("../../capacitor.config")
    expect(mod.default.appName).toBe("CeliMap Preview")
  })

  it("release lock rechaza vars preview", async () => {
    process.env.CAPACITOR_RELEASE_LOCK = "1"
    process.env.CAPACITOR_SERVER_MODE = "preview"
    process.env.CAPACITOR_SERVER_URL = "https://preview.example.com"
    await expect(import("../../capacitor.config")).rejects.toThrow(/Release lock/)
  })
})
