import { registerPlugin } from "@capacitor/core"
import { isNativeIosApp } from "@/lib/native-app"

type ReviewTrigger = "favorite" | "review"

type ReviewNativePlugin = {
  consider(options: { trigger: ReviewTrigger }): Promise<{
    requested: boolean
    reason: string
  }>
  debugStatus(): Promise<Record<string, string | number | boolean | null>>
  debugReset(): Promise<void>
  debugForce(): Promise<void>
}

const ReviewNative = registerPlugin<ReviewNativePlugin>("Review")

const DELAY_MS = 1500

let inFlight = false
let requestedThisWebView = false

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Pide reseña nativa tras un éxito. Idempotente: ignora si hay vuelo
 * o si esta sesión WebView ya llamó a requestReview.
 */
export function considerInAppReview(trigger: ReviewTrigger): void {
  if (typeof window === "undefined") return
  if (!isNativeIosApp()) return
  if (inFlight || requestedThisWebView) {
    console.log("[Review] skip consider", { trigger, inFlight, requestedThisWebView })
    return
  }
  inFlight = true
  void (async () => {
    try {
      await sleep(DELAY_MS)
      if (requestedThisWebView) return
      const result = await ReviewNative.consider({ trigger })
      console.log("[Review] consider", result)
      if (result.requested) requestedThisWebView = true
    } catch (error) {
      console.warn("[Review] consider failed", error)
    } finally {
      inFlight = false
    }
  })()
}

export function attachReviewDebugToWindow(): void {
  if (typeof window === "undefined" || !isNativeIosApp()) return
  ;(
    window as Window & {
      CeliMapReview?: {
        debugStatus: ReviewNativePlugin["debugStatus"]
        debugReset: ReviewNativePlugin["debugReset"]
        debugForce: ReviewNativePlugin["debugForce"]
      }
    }
  ).CeliMapReview = {
    debugStatus: () => ReviewNative.debugStatus(),
    debugReset: () => ReviewNative.debugReset(),
    debugForce: () => ReviewNative.debugForce(),
  }
}

export function resetNativeReviewFlightForTests(): void {
  inFlight = false
  requestedThisWebView = false
}
