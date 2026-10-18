"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, CameraOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { stampPathFromScan } from "@/lib/wallet/scan"

type Status = "idle" | "starting" | "scanning" | "found" | "denied" | "unavailable" | "error"

type Detector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> }

const SCAN_EVERY_MS = 200

/** Lector rápido nativo (Chrome/Android); si no hay, jsQR (iPhone). */
function nativeDetector(): Detector | null {
  const Ctor = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector })
    .BarcodeDetector
  if (!Ctor) return null
  try {
    return new Ctor({ formats: ["qr_code"] })
  } catch {
    return null
  }
}

/**
 * Cámara trasera + lectura del QR de la tarjeta. Al leer una tarjeta de CeliMap, abre la página
 * para sumar el sello. Funciona en el navegador y dentro de la app (con permiso de cámara).
 */
export function CardScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [hint, setHint] = useState<string | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async () => {
    setHint(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable")
      return
    }
    setStatus("starting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      setStatus("scanning")
    } catch (error) {
      const name = error instanceof Error ? error.name : ""
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "unavailable" : "error")
    }
  }, [])

  useEffect(() => {
    void start()
    return stop
  }, [start, stop])

  useEffect(() => {
    if (status !== "scanning") return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    const detector = nativeDetector()
    let jsQR: ((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null

    async function readFrame(): Promise<string | null> {
      const video = videoRef.current
      if (!video || video.readyState < 2 || !video.videoWidth) return null
      if (detector) {
        const codes = await detector.detect(video).catch(() => [])
        return codes[0]?.rawValue ?? null
      }
      if (!jsQR) jsQR = (await import("jsqr")).default
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d", { willReadFrequently: true })
      if (!canvas || !ctx) return null
      // Achicado: alcanza para leer el QR y es mucho más rápido en celus viejos.
      const scale = Math.min(1, 640 / video.videoWidth)
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
      return jsQR(image.data, image.width, image.height)?.data ?? null
    }

    async function tick() {
      if (cancelled) return
      const text = await readFrame().catch(() => null)
      if (cancelled) return
      if (text) {
        const path = stampPathFromScan(text, window.location.origin)
        if (path) {
          setStatus("found")
          stop()
          if (navigator.vibrate) navigator.vibrate(60)
          window.location.assign(path)
          return
        }
        setHint("Ese QR no es una tarjeta de sellos de CeliMap.")
      }
      timer = setTimeout(tick, SCAN_EVERY_MS)
    }

    void tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [status, stop])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted aria-label="Cámara" />
        <canvas ref={canvasRef} className="hidden" aria-hidden />
        {status === "scanning" && (
          <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        )}
        {(status === "starting" || status === "found") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            <span>{status === "found" ? "Abriendo la tarjeta…" : "Prendiendo la cámara…"}</span>
          </div>
        )}
        {(status === "denied" || status === "unavailable" || status === "error") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white">
            <CameraOff className="h-8 w-8" aria-hidden />
          </div>
        )}
      </div>

      <p role="status" className="text-center text-olive">
        {status === "scanning" && (hint ?? "Apuntá al QR de la tarjeta del cliente.")}
        {status === "denied" &&
          "CeliMap no tiene permiso para usar la cámara. Habilitalo en los ajustes del celu (o del navegador) y tocá Reintentar."}
        {status === "unavailable" && "Este dispositivo no tiene cámara disponible acá. Usá la cámara del celu para escanear el QR."}
        {status === "error" && "No pudimos prender la cámara. Probá de nuevo."}
      </p>

      {(status === "denied" || status === "error" || status === "unavailable") && (
        <Button onClick={() => void start()}>
          <Camera className="mr-2 h-4 w-4" aria-hidden />
          Reintentar
        </Button>
      )}
    </div>
  )
}
