/**
 * Lee el QR de un cuadro de video. Usa el lector nativo del celu (BarcodeDetector) si lo hay y
 * funciona; si no, jsQR. En algunos Android el BarcodeDetector existe pero tira error o nunca lee
 * nada (le falta el módulo de Google Play): después de un rato sin leer, también se prueba con jsQR.
 */

export type NativeDetector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> }

export type NativeDetectorCtor = {
  new (options: { formats: string[] }): NativeDetector
  getSupportedFormats?: () => Promise<string[]>
}

/** Cuadros sin leer nada con el lector nativo antes de sumar jsQR (a 200 ms por cuadro, 2 segundos). */
export const NATIVE_GRACE_FRAMES = 10

export async function createNativeDetector(Ctor: NativeDetectorCtor | undefined): Promise<NativeDetector | null> {
  if (!Ctor) return null
  try {
    const formats = await Ctor.getSupportedFormats?.()
    if (formats && !formats.includes("qr_code")) return null
    return new Ctor({ formats: ["qr_code"] })
  } catch {
    return null
  }
}

export function createQrReader<Source extends CanvasImageSource>(deps: {
  native: NativeDetector | null
  /** Lee con jsQR (lo carga la primera vez que hace falta). */
  decodeWithJsQr: (source: Source) => Promise<string | null>
}) {
  let native = deps.native
  let nativeMisses = 0
  return {
    async read(source: Source): Promise<string | null> {
      if (native) {
        try {
          const value = (await native.detect(source))[0]?.rawValue
          if (value) return value
          nativeMisses += 1
        } catch {
          // Existe pero no anda en este celu: de acá en más, sólo jsQR.
          native = null
        }
        if (native && nativeMisses < NATIVE_GRACE_FRAMES) return null
      }
      return deps.decodeWithJsQr(source)
    },
    /** Para tests. */
    get usingNative() {
      return native !== null
    },
  }
}
