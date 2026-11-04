import { createNativeDetector, createQrReader, NATIVE_GRACE_FRAMES, type NativeDetectorCtor } from "@/lib/wallet/qr-reader"

type Frame = { id: number }
const frame = { id: 1 } as unknown as CanvasImageSource & Frame

function nativeCtor(detect: () => Promise<Array<{ rawValue: string }>>, formats?: string[]): NativeDetectorCtor {
  const Ctor = function (this: { detect: typeof detect }) {
    this.detect = detect
  } as unknown as NativeDetectorCtor
  if (formats) Ctor.getSupportedFormats = async () => formats
  return Ctor
}

describe("lector de QR del escáner", () => {
  it("uses the phone's reader when it supports QR", async () => {
    const native = await createNativeDetector(nativeCtor(async () => [{ rawValue: "https://x/local/sellar/a" }], ["qr_code"]))
    const jsqr = jest.fn()
    const reader = createQrReader({ native, decodeWithJsQr: jsqr })
    expect(await reader.read(frame)).toBe("https://x/local/sellar/a")
    expect(jsqr).not.toHaveBeenCalled()
  })

  it("ignores a reader without QR support, and works without any", async () => {
    expect(await createNativeDetector(nativeCtor(async () => [], ["ean_13"]))).toBeNull()
    expect(await createNativeDetector(undefined)).toBeNull()
    const jsqr = jest.fn().mockResolvedValue("qr")
    expect(await createQrReader({ native: null, decodeWithJsQr: jsqr }).read(frame)).toBe("qr")
  })

  it("falls back to jsQR if the phone's reader throws (some Android)", async () => {
    const native = await createNativeDetector(
      nativeCtor(async () => {
        throw new Error("NotSupportedError: Barcode detection service unavailable")
      })
    )
    const jsqr = jest.fn().mockResolvedValue("qr")
    const reader = createQrReader({ native, decodeWithJsQr: jsqr })
    expect(await reader.read(frame)).toBe("qr")
    expect(reader.usingNative).toBe(false)
  })

  it("also tries jsQR if the phone's reader never reads anything", async () => {
    const native = await createNativeDetector(nativeCtor(async () => []))
    const jsqr = jest.fn().mockResolvedValue("qr")
    const reader = createQrReader({ native, decodeWithJsQr: jsqr })
    for (let i = 0; i < NATIVE_GRACE_FRAMES - 1; i++) expect(await reader.read(frame)).toBeNull()
    expect(jsqr).not.toHaveBeenCalled()
    expect(await reader.read(frame)).toBe("qr")
  })
})
