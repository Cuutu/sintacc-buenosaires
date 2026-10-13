/**
 * @jest-environment jsdom
 */
import { OPEN_CELIBOT_EVENT, openCeliBot, setCeliBotWidgetReady } from "@/lib/celibot-open"

describe("abrir CeliBot desde el buscador / el mapa", () => {
  afterEach(() => {
    setCeliBotWidgetReady(false)
  })

  it("si el widget todavía no cargó, el pedido queda pendiente y se toma al montar", () => {
    const seen: unknown[] = []
    const onOpen = (e: Event) => seen.push((e as CustomEvent).detail)
    window.addEventListener(OPEN_CELIBOT_EVENT, onOpen)
    openCeliBot("  panaderías en Palermo ")
    expect(seen).toEqual([])
    expect(setCeliBotWidgetReady(true)).toEqual({ prompt: "panaderías en Palermo" })
    // Se consume una sola vez
    setCeliBotWidgetReady(false)
    expect(setCeliBotWidgetReady(true)).toBeNull()
    window.removeEventListener(OPEN_CELIBOT_EVENT, onOpen)
  })

  it("con el widget montado, emite el evento (texto vacío = sin prompt)", () => {
    setCeliBotWidgetReady(true)
    const seen: unknown[] = []
    const onOpen = (e: Event) => seen.push((e as CustomEvent).detail)
    window.addEventListener(OPEN_CELIBOT_EVENT, onOpen)
    openCeliBot("   ")
    window.removeEventListener(OPEN_CELIBOT_EVENT, onOpen)
    expect(seen).toEqual([{ prompt: undefined }])
  })
})
